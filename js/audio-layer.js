/**
 * audio-layer.js — High-performance audio layer for polyrhythms.
 *
 * Instead of one Tone.Synth per voice (which overwhelms the Web Audio thread
 * with many voices), this pre-renders a single "ping" waveform into an
 * AudioBuffer at init time.  Each trigger simply spawns a lightweight
 * AudioBufferSourceNode with playbackRate-based pitch shifting — practically
 * free compared to live oscillators.
 *
 * A voice pool caps the number of simultaneously playing sources so the
 * audio thread never overloads, and simultaneous triggers within the same
 * frame are staggered by ~2 ms to avoid burst-scheduling clicks.
 */

class AudioLayer {
  constructor() {
    /** @type {AudioBuffer|null} Pre-rendered ping at BASE_FREQ */
    this._buffer = null;

    /** @type {AudioBufferSourceNode[]} Currently-playing source nodes */
    this._activeSources = [];

    // Web Audio nodes (native — no Tone.js overhead for per-note work)
    this._dryGain = null; // dry path gain
    this._wetGain = null; // wet (delay-send) gain
    this._delay = null; // DelayNode
    this._feedback = null; // feedback gain
    this._lpf = null; // low-pass on feedback loop
    this._compressor = null; // dynamics compressor
    this._masterGain = null;

    this._baseFreq = 440; // Frequency the buffer was rendered at
    this.initialized = false;

    /** Max simultaneous buffer sources before voice-stealing kicks in */
    this.MAX_VOICES = 48;
  }

  /* ------------------------------------------------------------------ */
  /*  Initialisation                                                     */
  /* ------------------------------------------------------------------ */

  /**
   * Initialise the audio chain.  Call after Tone.start().
   * @param {Array<{note: {frequency: number}}>} voices — only used so the
   *        public API stays the same; we no longer create per-voice synths.
   */
  async init(voices) {
    if (this.initialized) this.dispose();

    const ctx = Tone.getContext().rawContext;

    // ── Pre-render a sine "ping" into an AudioBuffer ──
    this._buffer = this._renderPingBuffer(ctx.sampleRate);

    // ── Build a native Web Audio effects chain ──
    // This avoids the per-node Tone.js wrapper overhead entirely.
    //
    //  source ─┬─► dryGain ──────────────┬─► compressor ─► masterGain ─► dest
    //          └─► wetGain ─► delay ─► lpf ─┘
    //                          ▲       │
    //                          └── feedback ◄─┘

    this._masterGain = ctx.createGain();
    this._masterGain.gain.value = 0.8;

    // Compressor to tame simultaneous-note loudness spikes
    this._compressor = ctx.createDynamicsCompressor();
    this._compressor.threshold.value = -18; // start compressing at -18 dB
    this._compressor.knee.value = 12;
    this._compressor.ratio.value = 6;
    this._compressor.attack.value = 0.003;
    this._compressor.release.value = 0.15;

    this._masterGain.connect(this._compressor);
    this._compressor.connect(ctx.destination);

    // Dry path
    this._dryGain = ctx.createGain();
    this._dryGain.gain.value = 0.85;
    this._dryGain.connect(this._masterGain);

    // Wet path — feedback delay "reverb"
    this._wetGain = ctx.createGain();
    this._wetGain.gain.value = 0.35;

    this._delay = ctx.createDelay(1.0);
    this._delay.delayTime.value = 0.2;

    this._feedback = ctx.createGain();
    this._feedback.gain.value = 0.3;

    this._lpf = ctx.createBiquadFilter();
    this._lpf.type = 'lowpass';
    this._lpf.frequency.value = 2800;

    // Wire wet path
    this._wetGain.connect(this._delay);
    this._delay.connect(this._lpf);
    this._lpf.connect(this._masterGain); // wet output
    this._lpf.connect(this._feedback); // feedback tap
    this._feedback.connect(this._delay); // loop back

    this.initialized = true;
  }

  /* ------------------------------------------------------------------ */
  /*  Buffer rendering                                                   */
  /* ------------------------------------------------------------------ */

  /**
   * Build a ping AudioBuffer sample-by-sample with the given waveform type.
   * @param {number} sampleRate
   * @param {'sine'|'triangle'|'square'|'sawtooth'|'pluck'} [type='sine']
   */
  _renderPingBuffer(sampleRate, type = 'sine') {
    sampleRate = sampleRate || 44100;
    const duration = type === 'pluck' ? 1.8 : 1.2;
    const length = Math.ceil(sampleRate * duration);
    const ctx = Tone.getContext().rawContext;
    const buffer = ctx.createBuffer(1, length, sampleRate);
    const data = buffer.getChannelData(0);

    const attackSamples = Math.ceil(sampleRate * 0.008); // 8 ms attack
    const fadeSamples = Math.ceil(sampleRate * 0.01); // 10 ms fade-out at end
    const decayRate = (type === 'pluck' ? 3.0 : 5.0) / duration;

    for (let i = 0; i < length; i++) {
      const t = i / sampleRate;
      const phase = 2 * Math.PI * this._baseFreq * t;

      // Waveform
      let wave;
      switch (type) {
        case 'triangle':
          wave = (2 / Math.PI) * Math.asin(Math.sin(phase));
          break;
        case 'square':
          wave = Math.sin(phase) >= 0 ? 0.6 : -0.6;
          break;
        case 'sawtooth':
          wave = 2 * ((this._baseFreq * t) % 1) - 1;
          break;
        case 'pluck': {
          // Karplus-Strong-ish: sine + decaying harmonics
          const h2 = Math.sin(phase * 2) * 0.5 * Math.exp(-8 * t);
          const h3 = Math.sin(phase * 3) * 0.3 * Math.exp(-12 * t);
          const noise = (Math.random() * 2 - 1) * Math.max(0, 0.3 - t * 4);
          wave = Math.sin(phase) + h2 + h3 + noise;
          break;
        }
        default: // sine
          wave = Math.sin(phase);
      }

      // Envelope: attack ramp × exponential decay
      let env;
      if (i < attackSamples) {
        env = i / attackSamples;
      } else {
        env = Math.exp(-decayRate * (t - attackSamples / sampleRate));
      }

      // Final fade-out
      const remaining = length - i;
      if (remaining < fadeSamples) {
        env *= remaining / fadeSamples;
      }

      data[i] = wave * env * 0.85;
    }

    return buffer;
  }

  /* ------------------------------------------------------------------ */
  /*  Per-frame update                                                   */
  /* ------------------------------------------------------------------ */

  /**
   * Check voices for triggers and play notes.
   * Simultaneous triggers are staggered by ~2 ms each to spread the load.
   * @param {Array<{triggered: boolean, note: {frequency: number}}>} voices
   */
  update(voices) {
    if (!this.initialized || !this._buffer) return;

    let triggerOffset = 0;
    for (let i = 0; i < voices.length; i++) {
      if (!voices[i].triggered) continue;

      const freq = voices[i].note.frequency;
      const ctx = Tone.getContext().rawContext;
      const when = ctx.currentTime + 0.005 + triggerOffset * 0.002;
      this._playBuffer(freq, when);
      triggerOffset++;
    }
  }

  /* ------------------------------------------------------------------ */
  /*  Buffer playback + voice pool                                       */
  /* ------------------------------------------------------------------ */

  /**
   * Play the pre-rendered buffer at the given frequency.
   * @param {number} freq  — desired frequency in Hz
   * @param {number} when  — audioContext time to start
   */
  _playBuffer(freq, when) {
    // ── Voice-stealing: drop oldest source if pool is full ──
    while (this._activeSources.length >= this.MAX_VOICES) {
      const old = this._activeSources.shift();
      try {
        old.stop();
      } catch (_) {
        /* already stopped */
      }
    }

    const ctx = Tone.getContext().rawContext;
    const src = ctx.createBufferSource();
    src.buffer = this._buffer;
    src.playbackRate.value = freq / this._baseFreq;

    // Connect to both dry and wet paths
    src.connect(this._dryGain);
    src.connect(this._wetGain);

    src.start(when);

    // Track and auto-remove on end
    this._activeSources.push(src);
    src.onended = () => {
      const idx = this._activeSources.indexOf(src);
      if (idx !== -1) this._activeSources.splice(idx, 1);
    };
  }

  /* ------------------------------------------------------------------ */
  /*  Volume                                                             */
  /* ------------------------------------------------------------------ */

  /**
   * Set master volume.
   * @param {number} percent 0–100
   */
  setVolume(percent) {
    if (!this._masterGain) return;
    if (percent <= 0) {
      this._masterGain.gain.value = 0;
    } else {
      // Map 0–100 → 0–0.8
      this._masterGain.gain.value = (percent / 100) * 0.8;
    }
  }

  /* ------------------------------------------------------------------ */
  /*  Mixer controls                                                     */
  /* ------------------------------------------------------------------ */

  /** Set wet/dry mix. @param {number} percent 0–100 */
  setReverbMix(percent) {
    if (!this._wetGain || !this._dryGain) return;
    const wet = percent / 100;
    this._wetGain.gain.value = wet * 0.7;
    this._dryGain.gain.value = 1 - wet * 0.3;
  }

  /** Set delay time in seconds. @param {number} seconds */
  setDelayTime(seconds) {
    if (!this._delay) return;
    this._delay.delayTime.value = Math.min(seconds, 0.99);
  }

  /** Set feedback amount. @param {number} percent 0–80 */
  setFeedback(percent) {
    if (!this._feedback) return;
    this._feedback.gain.value = Math.min(percent / 100, 0.85);
  }

  /** Set low-pass filter frequency. @param {number} freq Hz */
  setFilterFreq(freq) {
    if (!this._lpf) return;
    this._lpf.frequency.value = freq;
  }

  /**
   * Change the synth sound by re-rendering the ping buffer with a different waveform.
   * @param {'sine'|'triangle'|'square'|'sawtooth'|'pluck'} type
   */
  setSoundType(type) {
    if (!this.initialized) return;
    const sampleRate = Tone.getContext().rawContext.sampleRate || 44100;
    this._buffer = this._renderPingBuffer(sampleRate, type);
  }

  /* ------------------------------------------------------------------ */
  /*  Reinit / Dispose                                                   */
  /* ------------------------------------------------------------------ */

  /**
   * Reinitialise for new voice configs (API-compatible with old layer).
   */
  async reinit(voices) {
    await this.init(voices);
  }

  /**
   * Clean up all audio nodes.
   */
  dispose() {
    // Stop all playing sources
    this._activeSources.forEach((s) => {
      try {
        s.stop();
      } catch (_) {}
    });
    this._activeSources = [];

    [
      this._dryGain,
      this._wetGain,
      this._delay,
      this._feedback,
      this._lpf,
      this._compressor,
      this._masterGain,
    ].forEach((node) => {
      if (node) {
        try {
          node.disconnect();
        } catch (_) {}
      }
    });
    this._dryGain = null;
    this._wetGain = null;
    this._delay = null;
    this._feedback = null;
    this._lpf = null;
    this._compressor = null;
    this._masterGain = null;
    this._buffer = null;
    this.initialized = false;
  }
}
