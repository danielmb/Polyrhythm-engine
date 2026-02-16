class AmbientLayer {
  constructor() {
    this.disposed = false;
    this._buildChain();
    this.currentNotes = [];
  }

  /** Build the entire audio chain from scratch */
  _buildChain() {
    // PolySynth for chords
    this.synth = new Tone.PolySynth(Tone.Synth, {
      maxPolyphony: 8,
      oscillator: {
        type: 'fatsine',
        count: 3,
        spread: 30,
      },
      envelope: {
        attack: 2,
        decay: 1,
        sustain: 0.7,
        release: 3,
      },
    });

    // Effects chain
    this.filter = new Tone.Filter(800, 'lowpass');
    this.reverb = new Tone.Reverb({
      decay: 5,
      preDelay: 0.2,
      wet: 0.6,
    });
    this.chorus = new Tone.Chorus(2, 3, 0.4).start();
    this.vol = new Tone.Volume(-15);

    // Connect: synth → filter → chorus → reverb → vol → destination
    this.synth.connect(this.filter);
    this.filter.connect(this.chorus);
    this.chorus.connect(this.reverb);
    this.reverb.connect(this.vol);
    this.vol.toDestination();
  }

  playChord(notes, transposeSemitones = 0) {
    if (this.disposed) return;
    if (!notes || notes.length === 0) return;

    // Always release ALL currently sounding notes first
    try {
      this.synth.releaseAll();
    } catch (e) {
      /* ignore */
    }

    // Transpose by the given semitone offset
    try {
      const transposedNotes = notes.map((n) => {
        if (n && typeof n === 'object' && n.frequency) {
          return Tone.Frequency(n.frequency)
            .transpose(transposeSemitones)
            .toFrequency();
        }
        return Tone.Frequency(n).transpose(transposeSemitones).toFrequency();
      });

      this.currentNotes = transposedNotes;
      this.synth.triggerAttack(this.currentNotes);
    } catch (e) {
      console.warn('AmbientLayer playChord error:', e);
    }
  }

  stop() {
    if (this.disposed) return;
    try {
      this.synth.releaseAll();
    } catch (e) {
      /* ignore */
    }
    this.currentNotes = [];
  }

  /**
   * Set volume as a 0–100 percent value (matches the main volume slider).
   * Maps 0–100 → -60 dB to -5 dB (ambient should always sit underneath).
   * 0 → muted.
   */
  setVolume(percent) {
    if (this.disposed || !this.vol) return;
    if (percent <= 0) {
      this.vol.volume.value = -Infinity;
    } else {
      // Map 0-100 to -55 dB to -5 dB (sits below the main synths)
      this.vol.volume.value = -55 + (percent / 100) * 50;
    }
  }

  /** Tear down all Tone nodes so nothing keeps playing. */
  dispose() {
    this.disposed = true;
    try {
      this.synth.releaseAll();
    } catch (e) {}
    try {
      this.synth.dispose();
    } catch (e) {}
    try {
      this.filter.dispose();
    } catch (e) {}
    try {
      this.chorus.dispose();
    } catch (e) {}
    try {
      this.reverb.dispose();
    } catch (e) {}
    try {
      this.vol.dispose();
    } catch (e) {}
    this.synth = null;
    this.filter = null;
    this.chorus = null;
    this.reverb = null;
    this.vol = null;
    this.currentNotes = [];
  }
}
