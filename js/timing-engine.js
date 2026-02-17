/**
 * timing-engine.js — Core polyrhythm timing engine.
 * Calculates voice phases from absolute elapsed time (no drift).
 */

class TimingEngine {
  /**
   * @param {object} opts
   * @param {number} opts.bpm - Beats per minute
   * @param {Array<{ratio: number, note: object, color: number[]}>} opts.voiceConfigs
   * @param {number} opts.chordRatio - Ratio for chord progression changes (0 to disable)
   */
  constructor({ bpm = 60, voiceConfigs = [], chordRatio = 0 }) {
    this.bpm = bpm;
    this.chordRatio = chordRatio;
    this.voices = [];
    this.isRunning = false;
    this.startTime = 0;
    this.pausedElapsed = 0;
    this.elapsedBeats = 0;
    this.decayRate = 0.93;

    this.chordPhase = 0;
    this.previousChordPhase = 0;
    this.chordTriggered = false;

    this._initVoices(voiceConfigs);
  }

  _initVoices(configs) {
    this.voices = configs.map((cfg, i) => ({
      id: i,
      ratio: cfg.ratio,
      phase: 0,
      previousPhase: 0,
      triggered: false,
      triggerCooldown: 0,
      amplitude: 0,
      triggerGlow: 0, // 0..1 smooth decay for visual effects
      startDelay: cfg.startDelay || 0, // delay in seconds before voice starts
      sameNoteAsPrevious: cfg.sameNoteAsPrevious || false,
      note: cfg.note, // { midi, frequency, name }
      color: cfg.color, // [h, s, b]
      visualPhaseOffset: cfg.visualPhaseOffset || 0, // 0..1 visual starting position
      spatialOffset: cfg.spatialOffset || { x: 0, y: 0 }, // {x,y} -1..1 orbit center offset
    }));
  }

  start() {
    if (this.isRunning) return;
    this.isRunning = true;
    this.startTime = performance.now() - this.pausedElapsed;
  }

  stop() {
    if (!this.isRunning) return;
    this.isRunning = false;
    this.pausedElapsed = performance.now() - this.startTime;
  }

  toggle() {
    if (this.isRunning) this.stop();
    else this.start();
  }

  setBpm(bpm) {
    // Recalculate startTime so phases remain continuous when BPM changes
    if (this.isRunning) {
      const now = performance.now();
      const elapsedMs = now - this.startTime;
      const currentBeats = (elapsedMs / 1000) * (this.bpm / 60);
      // New startTime so that at the new BPM, elapsedBeats stays the same
      this.startTime = now - (currentBeats / (bpm / 60)) * 1000;
    } else {
      const currentBeats = (this.pausedElapsed / 1000) * (this.bpm / 60);
      this.pausedElapsed = (currentBeats / (bpm / 60)) * 1000;
    }
    this.bpm = bpm;
  }

  /**
   * Reinitialize voices with new configs.
   */
  setVoices(voiceConfigs) {
    this._initVoices(voiceConfigs);
    this.pausedElapsed = 0;
    if (this.isRunning) {
      this.startTime = performance.now();
    }
  }

  /**
   * Update all voice phases. Call once per frame.
   */
  update() {
    if (!this.isRunning) return;

    const now = performance.now();
    const elapsedMs = now - this.startTime;
    this.elapsedBeats = (elapsedMs / 1000) * (this.bpm / 60);

    // ── Chord Progression Trigger ──
    if (this.chordRatio > 0) {
      this.chordPhase = (this.elapsedBeats * this.chordRatio) % 1;
      if (this.chordPhase < this.previousChordPhase) {
        this.chordTriggered = true;
      } else {
        this.chordTriggered = false;
      }
      this.previousChordPhase = this.chordPhase;
    }

    for (let i = 0; i < this.voices.length; i++) {
      const voice = this.voices[i];

      // Apply start delay — voice doesn't tick until delay has elapsed
      const delayMs = voice.startDelay * 1000;
      const voiceElapsedMs = elapsedMs - delayMs;
      if (voiceElapsedMs < 0) {
        // Voice hasn't started yet
        voice.phase = 0;
        voice.previousPhase = 0;
        voice.triggered = false;
        voice.amplitude = 0;
        continue;
      }
      const voiceElapsedBeats = (voiceElapsedMs / 1000) * (this.bpm / 60);

      // Calculate phase from absolute time (no drift)
      voice.phase = (voiceElapsedBeats * voice.ratio) % 1;

      // Trigger detection — phase wrapped around
      if (voice.triggerCooldown > 0) {
        voice.triggerCooldown--;
        voice.triggered = false;
      } else if (voice.phase < voice.previousPhase) {
        voice.triggered = true;
        voice.amplitude = 1.0;
        voice.triggerGlow = 1.0; // spike glow on trigger
        voice.triggerCooldown = 3; // prevent double-fire for a few frames
      } else {
        voice.triggered = false;
      }

      // Amplitude envelope decay
      if (!voice.triggered) {
        voice.amplitude *= this.decayRate;
        if (voice.amplitude < 0.001) voice.amplitude = 0;
      }

      // Trigger glow — slow smooth decay (independent of amplitude)
      if (voice.triggerGlow > 0.001) {
        voice.triggerGlow *= 0.96; // ~60 frames to fade to near-zero
        if (voice.triggerGlow < 0.001) voice.triggerGlow = 0;
      }

      // Store for next frame
      voice.previousPhase = voice.phase;
    }
  }

  /**
   * Get elapsed time formatted as mm:ss.
   */
  getElapsedFormatted() {
    if (!this.isRunning && this.pausedElapsed === 0) return '00:00';
    const ms = this.isRunning
      ? performance.now() - this.startTime
      : this.pausedElapsed;
    const totalSec = Math.floor(ms / 1000);
    const min = Math.floor(totalSec / 60);
    const sec = totalSec % 60;
    return `${String(min).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
  }
}
