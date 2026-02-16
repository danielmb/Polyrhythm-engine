/**
 * audio-layer.js — Tone.js wrapper for polyrhythm audio.
 * Creates one synth per voice, routes through reverb → volume → destination.
 */

class AudioLayer {
  constructor() {
    this.synths = [];
    this.reverb = null;
    this.volume = null;
    this.filter = null;
    this.initialized = false;
  }

  /**
   * Initialize audio chain. Call after Tone.start().
   * @param {Array<{note: {frequency: number, name: string}}>} voices
   */
  async init(voices) {
    if (this.initialized) this.dispose();

    // Master volume
    this.volume = new Tone.Volume(-6).toDestination();

    // Low-pass filter for softness
    this.filter = new Tone.Filter({
      frequency: 3500,
      type: 'lowpass',
      rolloff: -12,
    }).connect(this.volume);

    // Reverb for space
    this.reverb = new Tone.Reverb({
      decay: 4.5,
      wet: 0.5,
    }).connect(this.filter);

    // Wait for reverb to generate its impulse response
    await this.reverb.generate();

    // Create one synth per voice
    this.synths = voices.map(() => {
      const synth = new Tone.Synth({
        oscillator: { type: 'sine' },
        envelope: {
          attack: 0.02,
          decay: 0.6,
          sustain: 0,
          release: 2.0,
        },
      }).connect(this.reverb);
      return synth;
    });

    this.initialized = true;
  }

  /**
   * Check voices for triggers and play notes.
   * @param {Array<{triggered: boolean, note: {frequency: number, name: string}}>} voices
   */
  update(voices) {
    if (!this.initialized) return;

    for (let i = 0; i < voices.length; i++) {
      if (voices[i].triggered && this.synths[i]) {
        const freq = voices[i].note.frequency;
        try {
          this.synths[i].triggerAttackRelease(freq, '8n', Tone.now() + 0.01);
        } catch (e) {
          // Synth may still be releasing — safe to ignore
        }
      }
    }
  }

  /**
   * Set master volume in dB (0 to -60).
   * @param {number} percent 0–100
   */
  setVolume(percent) {
    if (!this.volume) return;
    if (percent <= 0) {
      this.volume.volume.value = -Infinity;
    } else {
      // Map 0–100 to -40dB–0dB
      this.volume.volume.value = -40 + (percent / 100) * 40;
    }
  }

  /**
   * Reinitialize synths for new voice configs.
   */
  async reinit(voices) {
    await this.init(voices);
  }

  /**
   * Clean up all audio nodes.
   */
  dispose() {
    this.synths.forEach(s => {
      try { s.dispose(); } catch (e) {}
    });
    this.synths = [];
    if (this.reverb) { try { this.reverb.dispose(); } catch (e) {} this.reverb = null; }
    if (this.filter) { try { this.filter.dispose(); } catch (e) {} this.filter = null; }
    if (this.volume) { try { this.volume.dispose(); } catch (e) {} this.volume = null; }
    this.initialized = false;
  }
}
