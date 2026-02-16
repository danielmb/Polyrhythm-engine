/**
 * config.js — Scales, presets, and helper functions.
 */

const Config = (() => {
  // ── Scale Definitions (semitone intervals from root) ──
  const SCALES = {
    // --- EXISTING / BASICS ---
    majorPentatonic: { name: 'Major Pentatonic', intervals: [0, 2, 4, 7, 9] },
    minorPentatonic: { name: 'Minor Pentatonic', intervals: [0, 3, 5, 7, 10] },
    blues: { name: 'Blues', intervals: [0, 3, 5, 6, 7, 10] },
    chromatic: {
      name: 'Chromatic',
      intervals: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11],
    },
    wholeTone: { name: 'Whole Tone', intervals: [0, 2, 4, 6, 8, 10] },

    enigmatic: { name: 'Enigmatic', intervals: [0, 1, 4, 6, 8, 10, 11] },

    // --- STANDARD MODES (Church Modes) ---
    major: { name: 'Major (Ionian)', intervals: [0, 2, 4, 5, 7, 9, 11] },
    dorian: { name: 'Dorian', intervals: [0, 2, 3, 5, 7, 9, 10] },
    phrygian: { name: 'Phrygian', intervals: [0, 1, 3, 5, 7, 8, 10] },
    lydian: { name: 'Lydian', intervals: [0, 2, 4, 6, 7, 9, 11] },
    mixolydian: { name: 'Mixolydian', intervals: [0, 2, 4, 5, 7, 9, 10] },
    minor: { name: 'Minor (Aeolian)', intervals: [0, 2, 3, 5, 7, 8, 10] },
    locrian: { name: 'Locrian', intervals: [0, 1, 3, 5, 6, 8, 10] },

    // --- COMMON VARIATIONS ---
    harmonicMinor: {
      name: 'Harmonic Minor',
      intervals: [0, 2, 3, 5, 7, 8, 11],
    },
    melodicMinor: { name: 'Melodic Minor', intervals: [0, 2, 3, 5, 7, 9, 11] }, // Ascending form
    diminished: {
      name: 'Diminished (W-H)',
      intervals: [0, 2, 3, 5, 6, 8, 9, 11],
    },

    // --- EXOTIC ---
    doubleHarmonic: {
      name: 'Double Harmonic',
      intervals: [0, 1, 4, 5, 7, 8, 11],
    }, // "Misirlou" scale
    hirajoshi: { name: 'Hirajoshi', intervals: [0, 2, 3, 7, 8] }, // Japanese pentatonic
    // chords
    majorChord: { name: 'Major Chord', intervals: [0, 4, 7] },
    minorChord: { name: 'Minor Chord', intervals: [0, 3, 7] },
    dominant7thChord: { name: 'Dominant 7th Chord', intervals: [0, 4, 7, 10] },
    minor7thChord: { name: 'Minor 7th Chord', intervals: [0, 3, 7, 10] },
    major7thChord: { name: 'Major 7th Chord', intervals: [0, 4, 7, 11] },
    diminishedChord: { name: 'Diminished Chord', intervals: [0, 3, 6] },
    augmentedChord: { name: 'Augmented Chord', intervals: [0, 4, 8] },
  };

  // ── Chord Types for Ambient Pad ──
  const CHORD_TYPES = {
    major: { name: 'Major', intervals: [0, 4, 7] },
    minor: { name: 'Minor', intervals: [0, 3, 7] },
    major7: { name: 'Major 7th', intervals: [0, 4, 7, 11] },
    minor7: { name: 'Minor 7th', intervals: [0, 3, 7, 10] },
    dom7: { name: 'Dominant 7th', intervals: [0, 4, 7, 10] },
    dim: { name: 'Diminished', intervals: [0, 3, 6] },
    dim7: { name: 'Diminished 7th', intervals: [0, 3, 6, 9] },
    aug: { name: 'Augmented', intervals: [0, 4, 8] },
    sus2: { name: 'Sus2', intervals: [0, 2, 7] },
    sus4: { name: 'Sus4', intervals: [0, 5, 7] },
    add9: { name: 'Add9', intervals: [0, 4, 7, 14] },
    minorAdd9: { name: 'Minor Add9', intervals: [0, 3, 7, 14] },
    power: { name: 'Power (5th)', intervals: [0, 7] },
    major9: { name: 'Major 9th', intervals: [0, 4, 7, 11, 14] },
    minor9: { name: 'Minor 9th', intervals: [0, 3, 7, 10, 14] },
    dom9: { name: 'Dominant 9th', intervals: [0, 4, 7, 10, 14] },
  };

  // ── Chord Symbol Suffixes → CHORD_TYPES key ──
  // Maps common written suffixes to our CHORD_TYPES keys
  const CHORD_SUFFIXES = [
    // Longer suffixes first so greedy match works
    { suffix: 'Maj9', key: 'major9' },
    { suffix: 'maj9', key: 'major9' },
    { suffix: 'Min9', key: 'minor9' },
    { suffix: 'min9', key: 'minor9' },
    { suffix: 'm9', key: 'minor9' },
    { suffix: 'Maj7', key: 'major7' },
    { suffix: 'maj7', key: 'major7' },
    { suffix: 'M7', key: 'major7' },
    { suffix: 'Min7', key: 'minor7' },
    { suffix: 'min7', key: 'minor7' },
    { suffix: 'm7', key: 'minor7' },
    { suffix: 'dom9', key: 'dom9' },
    { suffix: 'dom7', key: 'dom7' },
    { suffix: '9', key: 'dom9' },
    { suffix: '7', key: 'dom7' },
    { suffix: 'dim7', key: 'dim7' },
    { suffix: 'dim', key: 'dim' },
    { suffix: 'aug', key: 'aug' },
    { suffix: 'sus2', key: 'sus2' },
    { suffix: 'sus4', key: 'sus4' },
    { suffix: 'add9', key: 'add9' },
    { suffix: 'madd9', key: 'minorAdd9' },
    { suffix: 'Min', key: 'minor' },
    { suffix: 'min', key: 'minor' },
    { suffix: 'Maj', key: 'major' },
    { suffix: 'maj', key: 'major' },
    { suffix: 'm', key: 'minor' },
    { suffix: 'M', key: 'major' },
    { suffix: '5', key: 'power' },
  ];

  /**
   * Parse a chord symbol string like "CMaj7", "Am7", "F#dim", "Ebsus4"
   * into { rootMidi, chordTypeKey, rootName, displayName }.
   *
   * Supports optional octave: "CMaj7" defaults to octave 3,
   * "C4Maj7" or "C4maj7" uses octave 4.
   */
  function parseChordSymbol(symbol) {
    if (!symbol || typeof symbol !== 'string') {
      return {
        rootMidi: 60,
        chordTypeKey: 'major',
        rootName: 'C',
        displayName: symbol || 'C',
      };
    }

    const str = symbol.trim();

    // Normalize flats to sharps for MIDI lookup
    const flatToSharp = {
      Db: 'C#',
      Eb: 'D#',
      Fb: 'E',
      Gb: 'F#',
      Ab: 'G#',
      Bb: 'A#',
      Cb: 'B',
    };

    // Strategy: try TWO interpretations and pick the right one.
    //   1. "G7"  → root=G, octave=default, suffix="7"  (dominant 7th)
    //   2. "C4Maj7" → root=C, octave=4, suffix="Maj7"
    //
    // Rule: a digit is only an octave if there's still a valid suffix
    // (or nothing) after it. Otherwise treat it as part of the suffix.

    // Match note root: letter + optional # or b
    const noteMatch = str.match(/^([A-G][#b]?)/);
    if (!noteMatch) {
      return {
        rootMidi: 60,
        chordTypeKey: 'major',
        rootName: 'C',
        displayName: str,
      };
    }

    const rootName = noteMatch[1];
    const midiRoot = flatToSharp[rootName] || rootName;
    const afterRoot = str.slice(noteMatch[0].length); // everything after "C", "G#", "Bb", etc.

    let octave = 3; // default
    let suffixStr = afterRoot;

    // Check if it starts with a digit
    const digitMatch = afterRoot.match(/^(\d)(.*)/);
    if (digitMatch) {
      const candidateOctave = parseInt(digitMatch[1]);
      const candidateSuffix = digitMatch[2];

      // Only treat as octave if:
      //  - the remainder is empty (bare note like "C4"), OR
      //  - the remainder starts with a letter (like "4Maj7", "4m7")
      // Do NOT treat as octave if remainder is empty-ish AND the digit
      // itself is a known suffix (like "7" or "9" or "5").
      const digitIsChordSuffix = CHORD_SUFFIXES.some(
        (s) => s.suffix === afterRoot,
      );

      if (digitIsChordSuffix) {
        // "G7" → suffix is "7", octave stays default
        octave = 3;
        suffixStr = afterRoot;
      } else if (
        candidateSuffix.length === 0 ||
        /^[A-Za-z]/.test(candidateSuffix)
      ) {
        // "C4" or "C4Maj7" → digit is octave
        octave = candidateOctave;
        suffixStr = candidateSuffix;
      } else {
        // Fallback: treat entire thing as suffix
        suffixStr = afterRoot;
      }
    }

    const rootMidi = NOTE_NAMES.indexOf(midiRoot) + (octave + 1) * 12;

    // Match suffix against known chord types
    let chordTypeKey = 'major'; // default if no suffix or unrecognized
    if (suffixStr.length > 0) {
      for (const { suffix, key } of CHORD_SUFFIXES) {
        if (suffixStr === suffix) {
          chordTypeKey = key;
          break;
        }
      }
    }

    return {
      rootMidi,
      chordTypeKey,
      rootName,
      displayName: str,
    };
  }

  /**
   * Build chord notes from a root MIDI note using a chord type.
   * Returns array of {midi, frequency, name} objects.
   */
  function getChordNotes(rootMidi, chordTypeKey) {
    const chord = CHORD_TYPES[chordTypeKey];
    if (!chord) {
      return getChordNotes(rootMidi, 'major');
    }
    return chord.intervals.map((interval) => {
      const midi = rootMidi + interval;
      return {
        midi,
        frequency: midiToFrequency(midi),
        name: midiToNoteName(midi),
      };
    });
  }

  /**
   * Spread chord tones across octaves to fill `count` voice slots.
   * The chord tones repeat in ascending octaves, giving every voice
   * a note that belongs to the current chord.
   *
   * @param {number} rootMidi - Root MIDI note of the chord
   * @param {string} chordTypeKey - Key into CHORD_TYPES
   * @param {number} count - Number of voices to fill
   * @param {number|null} maxMidi - Optional ceiling; wraps around
   * @returns {Array<{midi, frequency, name}>}
   */
  function getVoiceNotesFromChord(
    rootMidi,
    chordTypeKey,
    count,
    maxMidi = null,
  ) {
    const chord = CHORD_TYPES[chordTypeKey] || CHORD_TYPES['major'];
    const intervals = chord.intervals;
    const notes = [];
    let octaveOffset = 0;
    let idx = 0;

    while (notes.length < count) {
      let midi = rootMidi + octaveOffset * 12 + intervals[idx];

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

  // ── MIDI helpers ──
  const NOTE_NAMES = [
    'C',
    'C#',
    'D',
    'D#',
    'E',
    'F',
    'F#',
    'G',
    'G#',
    'A',
    'A#',
    'B',
  ];

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
    giantSteps: {
      name: 'Giant Steps',
      ratios: [...createSmoothRatios(15, 1, 2)],
      scale: 'major',
      rootNote: 'C2',
      bpm: 20,
      description: 'Giant Steps-inspired progression with 10 voices',
      chordRatio: 1,
      maxNote: 'C7',
      chordProgression: [
        'BMaj7',
        'D7',
        'GMaj7',
        'Bb7',
        'EbMaj7',
        'AMin7',
        'D7',
        'GMaj7',
        'Bb7',
        'EbMaj7',
        'F#7',
        'BMaj7',
        'FMin7',
        'Bb7',
        'EbMaj7',
        'AMin7',
        'D7',
        'GMaj7',
        'C#Min7',
        'F#7',
        'BMaj7',
        'FMin7',
        'Bb7',
        'EbMaj7',
        'C#Min7',
        'F#7',
        'BMaj7',
        'FMin7',
        'Bb7',
        'EbMaj7',
        'C#Min7',
        'F#7',
        'BMaj7',
        'FMin7',
        'Bb7',
      ],
    },
    extremelyFrickingSlow: {
      name: 'Extremely Fricking Slow',
      ratios: [0.5, ...createSmoothRatios(10, 1, 1.5)],
      scale: 'lydian',
      rootNote: 'C4',
      bpm: 20,
      description: '10-voice, imperceptibly slow drift',
      chordRatio: 0.5,
      chordProgression: ['CMaj7', 'Am7', 'FMaj7', 'G7'],
    },
    aMess: {
      name: 'A Mess',
      ratios: [0.5, ...createSmoothRatios(100, 1, 2)],
      scale: 'chromatic',
      rootNote: 'C4',
      bpm: 1,
      description: '100-voice chromatic chaos',
      chordRatio: 2,
      chordProgression: ['C7', 'A7', 'F7', 'G7'],
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
      chordProgression: ['Cm7', 'BbMaj7', 'Gm7', 'FMaj7', 'Em7', 'Dm7', 'Cm7'],
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
    const notes = getNotesForScale(
      rootMidi,
      preset.scale,
      preset.ratios.length,
      maxMidi,
    );
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

  // ── Math Helpers ──
  const gcd = (a, b) => {
    if (!Number.isFinite(a) || !Number.isFinite(b)) return 1;
    a = Math.abs(a);
    b = Math.abs(b);
    while (b) {
      const t = b;
      b = a % b;
      a = t;
    }
    return a;
  };
  const lcm = (a, b) => {
    if (!Number.isFinite(a) || !Number.isFinite(b)) return 0;
    if (a === 0 || b === 0) return 0;
    return Math.abs((a * b) / gcd(a, b));
  };

  function getPolyrhythmResolution(ratios) {
    if (!ratios || ratios.length === 0) return 0;

    // Convert ratios (freq) to Period Fractions (1/freq)
    // ratio = n/d. Period = d/n.
    const periods = ratios.map((r) => {
      // Approximate ratio as fraction (max denom 100000 for "daily" cycles)
      const D = 100000;
      const N = Math.round(r * D);
      const common = gcd(N, D);
      return { n: D / common, d: N / common }; // Period = 1/r = D/N
    });

    // LCM(n1/d1, n2/d2) = LCM(n1, n2) / GCD(d1, d2)
    let num = periods[0].n;
    let den = periods[0].d;

    for (let i = 1; i < periods.length; i++) {
      num = lcm(num, periods[i].n);
      den = gcd(den, periods[i].d);
    }

    return num / den; // Total Beats
  }

  return {
    SCALES,
    CHORD_TYPES,
    CHORD_SUFFIXES,
    PRESETS,
    noteNameToMidi,
    midiToFrequency,
    midiToNoteName,
    getNotesForScale,
    getChordNotes,
    getVoiceNotesFromChord,
    parseChordSymbol,
    generateColors,
    buildVoiceConfig,
    createSmoothRatios,
    getPolyrhythmResolution,
  };
})();
