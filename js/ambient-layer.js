class AmbientLayer {
  constructor() {
    // PolySynth for chords
    this.synth = new Tone.PolySynth(Tone.Synth, {
      oscillator: {
        type: "fatsine", // Richer sound
        count: 3,
        spread: 30
      },
      envelope: {
        attack: 2,
        decay: 1,
        sustain: 0.7,
        release: 3
      }
    });

    // Effects chain
    this.filter = new Tone.Filter(800, "lowpass");
    this.reverb = new Tone.Reverb({
      decay: 5,
      preDelay: 0.2,
      wet: 0.6
    });
    this.chorus = new Tone.Chorus(2, 3, 0.4).start(); // Frequency, DelayTime, Depth
    this.vol = new Tone.Volume(-15); // Quiet background

    // Connect
    this.synth.connect(this.filter);
    this.filter.connect(this.chorus);
    this.chorus.connect(this.reverb);
    this.reverb.connect(this.vol);
    this.vol.toDestination();

    this.currentNotes = [];
  }

  playChord(notes) {
    if (!notes || notes.length === 0) return;

    // Release previous chord smoothly
    if (this.currentNotes.length > 0) {
      this.synth.triggerRelease(this.currentNotes);
    }

    // Transpose down 1 octave for deep pad sound
    // Check if notes are frequencies or note names
    // If we get frequencies (numbers), we can just multiply by 0.5?
    // Tone.Frequency handles both.
    
    try {
        const lowerNotes = notes.map(n => {
            // Ensure n is valid
            return Tone.Frequency(n).transpose(-12);
        });
        
        this.currentNotes = lowerNotes;
        this.synth.triggerAttack(this.currentNotes);
    } catch (e) {
        console.warn("AmbientLayer Error:", e);
    }
  }

  stop() {
    this.synth.releaseAll();
    this.currentNotes = [];
  }

  setVolume(db) {
    this.vol.volume.rampTo(db, 0.1);
  }
}
