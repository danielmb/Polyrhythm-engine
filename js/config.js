/**
 * config.js — Scales, presets, and helper functions.
 */

const Config = (() => {
  // ── Scale Definitions (semitone intervals from root) ──
const SCALES = {
  // --- EXISTING / BASICS ---
  majorPentatonic: { name: 'Major Pentatonic', intervals: [0, 2, 4, 7, 9] },
  minorPentatonic: { name: 'Minor Pentatonic', intervals: [0, 3, 5, 7, 10] },
  blues:           { name: 'Blues',            intervals: [0, 3, 5, 6, 7, 10] },
  chromatic:       { name: 'Chromatic',        intervals: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11] },
  wholeTone:       { name: 'Whole Tone',       intervals: [0, 2, 4, 6, 8, 10] },

  enigmatic:       { name: 'Enigmatic',        intervals: [0, 1, 4, 6, 8, 10, 11] },

  // --- STANDARD MODES (Church Modes) ---
  major:           { name: 'Major (Ionian)',   intervals: [0, 2, 4, 5, 7, 9, 11] },
  dorian:          { name: 'Dorian',           intervals: [0, 2, 3, 5, 7, 9, 10] },
  phrygian:        { name: 'Phrygian',         intervals: [0, 1, 3, 5, 7, 8, 10] },
  lydian:          { name: 'Lydian',           intervals: [0, 2, 4, 6, 7, 9, 11] },
  mixolydian:      { name: 'Mixolydian',       intervals: [0, 2, 4, 5, 7, 9, 10] },
  minor:           { name: 'Minor (Aeolian)',  intervals: [0, 2, 3, 5, 7, 8, 10] },
  locrian:         { name: 'Locrian',          intervals: [0, 1, 3, 5, 6, 8, 10] },

  // --- COMMON VARIATIONS ---
  harmonicMinor:   { name: 'Harmonic Minor',   intervals: [0, 2, 3, 5, 7, 8, 11] },
  melodicMinor:    { name: 'Melodic Minor',    intervals: [0, 2, 3, 5, 7, 9, 11] }, // Ascending form
  diminished:      { name: 'Diminished (W-H)', intervals: [0, 2, 3, 5, 6, 8, 9, 11] },
  
  // --- EXOTIC ---
  doubleHarmonic:  { name: 'Double Harmonic',  intervals: [0, 1, 4, 5, 7, 8, 11] }, // "Misirlou" scale
  hirajoshi:       { name: 'Hirajoshi',        intervals: [0, 2, 3, 7, 8] },        // Japanese pentatonic
};

  // ── MIDI helpers ──
  const NOTE_NAMES = ['C','C#','D','D#','E','F','F#','G','G#','A','A#','B'];

  function noteNameToMidi(name) {
    const match = name.match(/^([A-G]#?)(\d)$/);
    if (!match) return 60;
    const note = NOTE_NAMES.indexOf(match[1]);
    const octave = parseInt(match[2]);
    return note + (octave + 1) * 12;
  }

  function midiToFrequency(midi) {
    return 440 * Math.pow(2, (midi - 69) / 12);
  }

  function midiToNoteName(midi) {
    const note = NOTE_NAMES[midi % 12];
    const octave = Math.floor(midi / 12) - 1;
    return note + octave;
  }

  /**
   * Generate `count` notes from a root MIDI note using a scale, spanning octaves.
   * Optional maxMidi causes notes to wrap around using modulo arithmetic.
   */
  function getNotesForScale(rootMidi, scaleKey, count, maxMidi = null) {
    const scale = SCALES[scaleKey];
    if (!scale) return [];
    const intervals = scale.intervals;
    const notes = [];
    let octaveOffset = 0;
    let idx = 0;
    while (notes.length < count) {
      let midi = rootMidi + octaveOffset * 12 + intervals[idx];
      
      // Wrap around if maxMidi is set
      if (maxMidi && midi > maxMidi) {
        const range = maxMidi - rootMidi;
        if (range > 0) {
          midi = rootMidi + ((midi - rootMidi) % range);
        }
      }

      notes.push({
        midi,
        frequency: midiToFrequency(midi),
        name: midiToNoteName(midi),
      });
      idx++;
      if (idx >= intervals.length) {
        idx = 0;
        octaveOffset++;
      }
    }
    return notes;
  }

  /**
   * Generate evenly spaced HSB colors for N voices.
   * Returns arrays of [h, s, b] with h in 0–360, s and b in 0–100.
   */
  function generateColors(count, saturation = 75, brightness = 90) {
    const colors = [];
    const hueOffset = 220; // start from a cool blue
    for (let i = 0; i < count; i++) {
      const h = (hueOffset + i * (360 / count)) % 360;
      colors.push([h, saturation, brightness]);
    }
    return colors;
  }

  // create a smooth array of ratios
  function createSmoothRatios(count, start, end) {
    const ratios = [];
    const step = (end - start) / (count - 1);
    for (let i = 0; i < count; i++) {
      ratios.push(start + i * step);
    }
    return ratios;
  }
  // ── Presets ──
  const PRESETS = {

    extremelyFrickingSlow: {
      name: 'Extremely Fricking Slow',
      ratios: [0.5, ...createSmoothRatios(10, 1, 1.50)],
      scale: 'lydian',
      rootNote: 'C4',
      bpm: 20,
      description: '10-voice, imperceptibly slow drift',
      chordRatio: 0.5,
      chordProgression: ['C4', 'A3', 'F3', 'G3'],
    },
    aMess: {
      name: 'A Mess',
      ratios: [0.5, ...createSmoothRatios(100, 1, 2)],
      scale: 'chromatic',
      rootNote: 'C4',
      bpm: 1,
      description: '10-voice, imperceptibly slow drift',
      chordRatio: 2,
      chordProgression: ['C4', 'A3', 'F3', 'G3'],
      maxNote: 'C6',
      easing: 'sine',
    },
    ABeautifulMess: {
      name: 'A Beautiful Mess',
      ratios: [...createSmoothRatios(25, 1, 0.7)],
      scale: 'dorian',
      rootNote: 'C4',
      bpm: 1,
      description: '25-voice, imperceptibly slow drift',
      chordRatio: 1,
      // beautiful dorian chord progression
      chordProgression: ['C4', 'B3', 'G3', 'F3', 'E3', 'D3', 'C3'],
      maxNote: 'C6',
    },
    
  };

  /**
   * Build a full voice configuration from a preset key.
   */
  function buildVoiceConfig(presetKey) {
    const preset = PRESETS[presetKey];
    if (!preset) return null;
    const rootMidi = noteNameToMidi(preset.rootNote);
    const maxMidi = preset.maxNote ? noteNameToMidi(preset.maxNote) : null;
    const notes = getNotesForScale(rootMidi, preset.scale, preset.ratios.length, maxMidi);
    const colors = generateColors(preset.ratios.length);
    return {
      preset,
      voices: preset.ratios.map((ratio, i) => ({
        ratio,
        note: notes[i],
        color: colors[i],
      })),
    };
  }

  return {
    SCALES,
    PRESETS,
    noteNameToMidi,
    midiToFrequency,
    midiToNoteName,
    getNotesForScale,
    generateColors,
    buildVoiceConfig,
    createSmoothRatios,
  };
})();
