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

    // Build all valid chord tones within the range first
    const pool = [];
    let octaveOffset = 0;
    while (true) {
      let added = false;
      for (const interval of intervals) {
        const midi = rootMidi + octaveOffset * 12 + interval;
        if (maxMidi && midi > maxMidi) break;
        pool.push(midi);
        added = true;
      }
      if (maxMidi && rootMidi + (octaveOffset + 1) * 12 > maxMidi && !added)
        break;
      if (!maxMidi && pool.length >= count) break;
      if (maxMidi && !added) break;
      octaveOffset++;
    }

    // If pool is empty (shouldn't happen), fallback to root
    if (pool.length === 0) pool.push(rootMidi);

    // Cycle through the pool to fill all voice slots
    return Array.from({ length: count }, (_, i) => {
      const midi = pool[i % pool.length];
      return {
        midi,
        frequency: midiToFrequency(midi),
        name: midiToNoteName(midi),
      };
    });
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
    const match = name.match(/^([A-G](?:#|b)?)(\d?)$/);
    if (!match) return 60;
    const flatToSharp = {
      Db: 'C#',
      Eb: 'D#',
      Fb: 'E',
      Gb: 'F#',
      Ab: 'G#',
      Bb: 'A#',
      Cb: 'B',
    };
    const norm = flatToSharp[match[1]] || match[1];
    const note = NOTE_NAMES.indexOf(norm);
    if (note < 0) return 60;
    const octave = match[2] ? parseInt(match[2]) : 4;
    return note + (octave + 1) * 12;
  }

  function midiToNoteObject(midi) {
    return {
      midi,
      frequency: midiToFrequency(midi),
      name: midiToNoteName(midi),
    };
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
  // ── Visual Phase Offset Patterns ──
  // Each returns an array of phase offsets (0..1) for N voices.
  // This shifts WHERE on the circle/swing each voice appears visually,
  // without changing the sound timing.
  const PHASE_PATTERNS = {
    none: {
      name: 'None (Aligned)',
      fn: (count) => Array.from({ length: count }, () => 0),
    },
    spread: {
      name: 'Even Spread',
      fn: (count) => Array.from({ length: count }, (_, i) => i / count),
    },
    halfSpread: {
      name: 'Half Spread',
      fn: (count) => Array.from({ length: count }, (_, i) => (i / count) * 0.5),
    },
    opposites: {
      name: 'Opposites',
      fn: (count) => Array.from({ length: count }, (_, i) => (i % 2) * 0.5),
    },
    thirds: {
      name: 'Thirds',
      fn: (count) => Array.from({ length: count }, (_, i) => (i % 3) / 3),
    },
    quarters: {
      name: 'Quarters',
      fn: (count) => Array.from({ length: count }, (_, i) => (i % 4) / 4),
    },
    wave: {
      name: 'Wave',
      fn: (count) =>
        Array.from({ length: count }, (_, i) => {
          const t = i / Math.max(count - 1, 1);
          return (Math.sin(t * Math.PI * 2) + 1) / 2; // 0..1
        }),
    },
    spiral: {
      name: 'Spiral',
      fn: (count) =>
        Array.from({ length: count }, (_, i) => {
          // Golden ratio spacing — never repeats, creates spirals
          return (i * 0.618033988749895) % 1;
        }),
    },
    cluster: {
      name: 'Cluster (grouped)',
      fn: (count) => {
        const groups = Math.min(3, count);
        return Array.from({ length: count }, (_, i) => {
          const group = i % groups;
          return group / groups + Math.random() * 0.05; // tight clusters
        });
      },
    },
    mirror: {
      name: 'Mirror',
      fn: (count) =>
        Array.from({ length: count }, (_, i) => {
          const t = i / Math.max(count - 1, 1);
          // First half goes 0 → 0.5, second half mirrors 0.5 → 0
          return t <= 0.5 ? t : 1 - t;
        }),
    },
    random: {
      name: 'Random',
      fn: (count) => Array.from({ length: count }, () => Math.random()),
    },
  };

  /**
   * Generate visual phase offsets for N voices using a pattern key.
   * Returns array of numbers (0..1).
   */
  function generatePhaseOffsets(count, patternKey) {
    const pattern = PHASE_PATTERNS[patternKey];
    if (!pattern) return PHASE_PATTERNS.none.fn(count);
    return pattern.fn(count);
  }

  // ── Spatial Offset Patterns ──
  // Each returns an array of {x, y} in range -1..1.
  // Shifts the CENTER of each voice's orbit, creating non-concentric paths.
  const SPATIAL_PATTERNS = {
    none: {
      name: 'None (Centered)',
      fn: (count) => Array.from({ length: count }, () => ({ x: 0, y: 0 })),
    },
    circle: {
      name: 'Circle',
      fn: (count) =>
        Array.from({ length: count }, (_, i) => {
          const angle = (i / count) * Math.PI * 2;
          return { x: Math.cos(angle), y: Math.sin(angle) };
        }),
    },
    wave: {
      name: 'Wave',
      fn: (count) =>
        Array.from({ length: count }, (_, i) => {
          const t = i / Math.max(count - 1, 1);
          return { x: 0, y: Math.sin(t * Math.PI * 2) };
        }),
    },
    spiral: {
      name: 'Spiral',
      fn: (count) =>
        Array.from({ length: count }, (_, i) => {
          const t = i / Math.max(count - 1, 1);
          const angle = t * Math.PI * 4;
          const r = 0.2 + t * 0.8;
          return { x: Math.cos(angle) * r, y: Math.sin(angle) * r };
        }),
    },
    diagonal: {
      name: 'Diagonal',
      fn: (count) =>
        Array.from({ length: count }, (_, i) => {
          const t = i / Math.max(count - 1, 1);
          return { x: t * 2 - 1, y: t * 2 - 1 };
        }),
    },
    vShape: {
      name: 'V-Shape',
      fn: (count) =>
        Array.from({ length: count }, (_, i) => {
          const t = i / Math.max(count - 1, 1);
          const x = t * 2 - 1;
          return { x, y: Math.abs(x) - 0.5 };
        }),
    },
    scatter: {
      name: 'Scatter',
      fn: (count) =>
        Array.from({ length: count }, () => ({
          x: Math.random() * 2 - 1,
          y: Math.random() * 2 - 1,
        })),
    },
    grid: {
      name: 'Grid',
      fn: (count) => {
        const cols = Math.ceil(Math.sqrt(count));
        const rows = Math.ceil(count / cols);
        return Array.from({ length: count }, (_, i) => {
          const col = i % cols;
          const row = Math.floor(i / cols);
          return {
            x: cols > 1 ? (col / (cols - 1)) * 2 - 1 : 0,
            y: rows > 1 ? (row / (rows - 1)) * 2 - 1 : 0,
          };
        });
      },
    },
    heart: {
      name: 'Heart',
      fn: (count) =>
        Array.from({ length: count }, (_, i) => {
          const t = (i / count) * Math.PI * 2;
          // Parametric heart curve
          const x = 16 * Math.pow(Math.sin(t), 3);
          const y = -(
            13 * Math.cos(t) -
            5 * Math.cos(2 * t) -
            2 * Math.cos(3 * t) -
            Math.cos(4 * t)
          );
          return { x: x / 17, y: y / 17 };
        }),
    },
    star: {
      name: 'Star',
      fn: (count) =>
        Array.from({ length: count }, (_, i) => {
          const t = i / Math.max(count - 1, 1);
          const angle = t * Math.PI * 2;
          const r = i % 2 === 0 ? 1.0 : 0.4; // alternate inner/outer points
          return { x: Math.cos(angle) * r, y: Math.sin(angle) * r };
        }),
    },
    figure8: {
      name: 'Figure-8',
      fn: (count) =>
        Array.from({ length: count }, (_, i) => {
          const t = (i / count) * Math.PI * 2;
          // Lemniscate of Bernoulli
          const denom = 1 + Math.sin(t) * Math.sin(t);
          return {
            x: Math.cos(t) / denom,
            y: (Math.sin(t) * Math.cos(t)) / denom,
          };
        }),
    },
    rings: {
      name: 'Concentric Rings',
      fn: (count) => {
        const ringCount = Math.max(2, Math.ceil(count / 6));
        return Array.from({ length: count }, (_, i) => {
          const ring = Math.floor(
            i / Math.max(1, Math.ceil(count / ringCount)),
          );
          const ringT = ring / Math.max(ringCount - 1, 1);
          const r = 0.3 + ringT * 0.7;
          const voicesInRing = Math.ceil(count / ringCount);
          const idxInRing = i % voicesInRing;
          const angle = (idxInRing / voicesInRing) * Math.PI * 2;
          return { x: Math.cos(angle) * r, y: Math.sin(angle) * r };
        });
      },
    },
    dna: {
      name: 'DNA Helix',
      fn: (count) =>
        Array.from({ length: count }, (_, i) => {
          const t = i / Math.max(count - 1, 1);
          const angle = t * Math.PI * 4; // two full turns
          const strand = i % 2 === 0 ? 1 : -1;
          return {
            x: Math.cos(angle) * 0.6 * strand,
            y: t * 2 - 1,
          };
        }),
    },
    flower: {
      name: 'Flower',
      fn: (count) =>
        Array.from({ length: count }, (_, i) => {
          const t = (i / count) * Math.PI * 2;
          const r = Math.cos(3 * t) * 0.6 + 0.4; // 3-petal rose + offset
          return { x: Math.cos(t) * r, y: Math.sin(t) * r };
        }),
    },
    galaxy: {
      name: 'Galaxy',
      fn: (count) => {
        const arms = 3;
        return Array.from({ length: count }, (_, i) => {
          const arm = i % arms;
          const t =
            Math.floor(i / arms) / Math.max(Math.ceil(count / arms) - 1, 1);
          const baseAngle = (arm / arms) * Math.PI * 2;
          const spiralAngle = baseAngle + t * Math.PI * 2.5;
          const r = 0.1 + t * 0.9;
          // Add slight jitter for organic feel
          const jitter = Math.sin(i * 7.13) * 0.08;
          return {
            x: Math.cos(spiralAngle) * r + jitter,
            y: Math.sin(spiralAngle) * r + jitter,
          };
        });
      },
    },
    cross: {
      name: 'Cross',
      fn: (count) =>
        Array.from({ length: count }, (_, i) => {
          const t = i / Math.max(count - 1, 1);
          if (i % 2 === 0) {
            // Horizontal arm
            return { x: t * 2 - 1, y: 0 };
          } else {
            // Vertical arm
            return { x: 0, y: t * 2 - 1 };
          }
        }),
    },
  };

  /**
   * Generate spatial offsets for N voices using a pattern key.
   * Returns array of {x, y} normalized to -1..1.
   */
  function generateSpatialOffsets(count, patternKey) {
    const pattern = SPATIAL_PATTERNS[patternKey];
    if (!pattern) return SPATIAL_PATTERNS.none.fn(count);
    return pattern.fn(count);
  }

  // ── Orbit Path Shapes ──
  // Each defines a parametric curve: given phase 0..1, return {x, y} in -1..1.
  // These control the SHAPE of each voice's orbit, not where the center is.
  const ORBIT_SHAPES = {
    circle: {
      name: 'Circle',
      fn: (phase) => {
        const a = phase * Math.PI * 2 - Math.PI / 2;
        return { x: Math.cos(a), y: Math.sin(a) };
      },
    },
    ellipse: {
      name: 'Ellipse',
      fn: (phase) => {
        const a = phase * Math.PI * 2 - Math.PI / 2;
        return { x: Math.cos(a), y: Math.sin(a) * 0.5 };
      },
    },
    figure8: {
      name: 'Figure-8',
      fn: (phase) => {
        const t = phase * Math.PI * 2;
        // Lissajous 1:2
        return { x: Math.sin(t), y: Math.sin(2 * t) * 0.5 };
      },
    },
    lissajous: {
      name: 'Lissajous (2:3)',
      fn: (phase) => {
        const t = phase * Math.PI * 2;
        return { x: Math.sin(2 * t), y: Math.sin(3 * t) };
      },
    },
    rose: {
      name: 'Rose (3 petals)',
      fn: (phase) => {
        const t = phase * Math.PI * 2;
        const r = Math.cos(3 * t);
        return { x: r * Math.cos(t), y: r * Math.sin(t) };
      },
    },
    rose4: {
      name: 'Rose (4 petals)',
      fn: (phase) => {
        const t = phase * Math.PI * 2;
        const r = Math.cos(2 * t);
        return { x: r * Math.cos(t), y: r * Math.sin(t) };
      },
    },
    heart: {
      name: 'Heart',
      fn: (phase) => {
        const t = phase * Math.PI * 2;
        const x = 16 * Math.pow(Math.sin(t), 3);
        const y = -(
          13 * Math.cos(t) -
          5 * Math.cos(2 * t) -
          2 * Math.cos(3 * t) -
          Math.cos(4 * t)
        );
        return { x: x / 17, y: y / 17 };
      },
    },
    infinity: {
      name: 'Infinity (∞)',
      fn: (phase) => {
        const t = phase * Math.PI * 2;
        const denom = 1 + Math.sin(t) * Math.sin(t);
        return {
          x: Math.cos(t) / denom,
          y: (Math.sin(t) * Math.cos(t)) / denom,
        };
      },
    },
    star5: {
      name: 'Star (5 point)',
      fn: (phase) => {
        // Star polygon — alternating between inner and outer radius
        const t = phase * Math.PI * 2;
        const points = 5;
        const sector = (Math.PI * 2) / points;
        const halfSector = sector / 2;
        const idx = t / halfSector;
        const frac = idx % 1;
        const isOuter = Math.floor(idx) % 2 === 0;
        const angle1 = Math.floor(idx) * halfSector;
        const angle2 = angle1 + halfSector;
        const r1 = isOuter ? 1.0 : 0.4;
        const r2 = isOuter ? 0.4 : 1.0;
        const x =
          r1 * Math.cos(angle1) * (1 - frac) + r2 * Math.cos(angle2) * frac;
        const y =
          r1 * Math.sin(angle1) * (1 - frac) + r2 * Math.sin(angle2) * frac;
        return { x, y };
      },
    },
    square: {
      name: 'Square',
      fn: (phase) => {
        // Superellipse with high exponent ≈ square
        const t = phase * Math.PI * 2;
        const n = 4; // squareness exponent
        const cosT = Math.cos(t);
        const sinT = Math.sin(t);
        const x = Math.sign(cosT) * Math.pow(Math.abs(cosT), 2 / n);
        const y = Math.sign(sinT) * Math.pow(Math.abs(sinT), 2 / n);
        return { x, y };
      },
    },
    triangle: {
      name: 'Triangle',
      fn: (phase) => {
        // Equilateral triangle path
        const t = phase * 3; // 3 sides
        const side = Math.floor(t) % 3;
        const frac = t - Math.floor(t);
        const verts = [
          { x: 0, y: -1 },
          { x: Math.sin((Math.PI * 2) / 3), y: Math.cos((Math.PI * 2) / 3) },
          { x: -Math.sin((Math.PI * 2) / 3), y: Math.cos((Math.PI * 2) / 3) },
        ];
        const a = verts[side];
        const b = verts[(side + 1) % 3];
        return {
          x: a.x + (b.x - a.x) * frac,
          y: a.y + (b.y - a.y) * frac,
        };
      },
    },
    spirograph: {
      name: 'Spirograph',
      fn: (phase) => {
        const t = phase * Math.PI * 2;
        const R = 1,
          r = 0.35,
          d = 0.6;
        const x = (R - r) * Math.cos(t) + d * Math.cos(((R - r) / r) * t);
        const y = (R - r) * Math.sin(t) - d * Math.sin(((R - r) / r) * t);
        const scale = 1.5; // normalize to ~-1..1
        return { x: x / scale, y: y / scale };
      },
    },
    butterfly: {
      name: 'Butterfly',
      fn: (phase) => {
        const t = phase * Math.PI * 2;
        const exp = Math.exp(Math.cos(t));
        const cos2 = Math.cos(2 * t);
        const sin5 = Math.pow(Math.sin(t / 12), 5);
        const r = exp - 2 * cos2 + sin5;
        const x = Math.sin(t) * r;
        const y = Math.cos(t) * r;
        const scale = 4; // normalize
        return { x: x / scale, y: -y / scale };
      },
    },
  };

  /**
   * Get orbit shape position for a given phase.
   * @param {string} shapeKey - key of ORBIT_SHAPES
   * @param {number} phase - 0..1
   * @returns {{x: number, y: number}} position in -1..1 range
   */
  function getOrbitShapePosition(shapeKey, phase) {
    const shape = ORBIT_SHAPES[shapeKey];
    if (!shape) return ORBIT_SHAPES.circle.fn(phase);
    return shape.fn(phase);
  }

  // ── Presets ──
  // Every preset carries a `category`, which the preset dropdown turns into
  // an <optgroup>.  Keys are camelCase and stable — user-saved presets live
  // in localStorage (see user-presets.js) and are merged in at runtime under
  // the `user` category.
  const PRESET_CATEGORIES = {
    essentials: 'Essentials',
    harmony: 'Harmony',
    textures: 'Textures',
    extremes: 'Extremes',
    user: 'My Presets',
    custom: 'Unsaved',
  };

  const PRESETS = {
    // ── Essentials ─────────────────────────────────────────────
    royalRoad: {
      name: '王道進行 (Royal Road)',
      category: 'essentials',
      description:
        'The J-pop "royal road" turnaround, drifting through 20 voices',
      ratios: [
        ...createSmoothRatios(10, 1, 2),
        ...createSmoothRatios(10, 1, 2),
      ],
      scale: 'chromatic',
      rootNote: 'C3',
      maxNote: 'C7',
      bpm: 12,
      // chordRatio is how often the chord changes, in beats:
      // 1 = every beat, 0.5 = every 2 beats, 0.25 = every 4 beats.
      chordRatio: 0.25,
      chordProgression: ['FMaj7', 'G7', 'Em7', 'Am7'],
      chordTonesOnly: true,
      ambientOctave: 0,
      visualPhasePattern: 'opposites',
    },
    theLick: {
      name: 'The Lick',
      category: 'essentials',
      description: 'The classic jazz lick, smeared across seven voices',
      manualVoices:
        '1.0+0.2s=D4,1.01+0.4s=E4,1.02+0.6s=F4,1.03+0.8s=G4,1.04+1.0s=E4,1.05+1.4s=C4,1.06+1.6s=D4',
      scale: 'chromatic',
      rootNote: 'C4',
      maxNote: 'C7',
      bpm: 20,
      chordRatio: 0.5,
      ambientOctave: 0,
    },
    majorCircle: {
      name: 'Major Circle',
      category: 'essentials',
      description: 'I-V-vi-IV at a walking pace, each voice shadowed by a twin',
      // Manual voice mode: ratio, ratio+delay, ratio, ratio+delay ...
      manualVoices:
        '1.0, 1.0+0.2s, 1.05, 1.05+0.2s, 1.1, 1.1+0.2s, 1.2, 1.2+0.2s',
      scale: 'major',
      rootNote: 'C4',
      maxNote: 'C7',
      bpm: 60,
      chordRatio: 1,
      chordProgression: ['CMaj7', 'GMaj7', 'AMin7', 'FMaj7'],
      chordTonesOnly: true,
      ambientOctave: 1,
    },
    minorWaltz: {
      name: 'Minor Waltz',
      category: 'essentials',
      description: '12 voices in threes over a minor turnaround',
      ratios: createSmoothRatios(12, 0.75, 1.5),
      scale: 'minor',
      rootNote: 'A3',
      maxNote: 'A6',
      bpm: 45,
      chordRatio: 0.75,
      chordProgression: ['Am7', 'Dm7', 'Em7', 'FMaj7'],
      chordTonesOnly: true,
      ambientOctave: 0,
      visualPhasePattern: 'thirds',
      spatialPattern: 'circle',
      orbitPath: 'triangle',
    },

    // ── Harmony ────────────────────────────────────────────────
    slowMajor: {
      name: 'Slow Major Drift',
      category: 'harmony',
      description: '25 voices at 3 BPM — one chord roughly every 20 seconds',
      ratios: createSmoothRatios(25, 1, 2),
      scale: 'major',
      rootNote: 'C4',
      maxNote: 'C7',
      bpm: 3,
      chordRatio: 1,
      chordProgression: ['CMaj7', 'Am7', 'FMaj7', 'G7'],
      chordTonesOnly: true,
      ambientOctave: 1,
    },
    giantSteps: {
      name: 'Giant Steps',
      category: 'harmony',
      description: 'The full 35-chord Coltrane cycle across 15 slow voices',
      ratios: createSmoothRatios(15, 0.25, 0.5),
      scale: 'chromatic',
      rootNote: 'C2',
      maxNote: 'C6',
      bpm: 40,
      chordRatio: 0.25,
      chordTonesOnly: true,
      ambientOctave: -1,
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
      visualPhasePattern: 'spiral',
    },
    bluesShuffle: {
      name: 'Blues Shuffle',
      category: 'harmony',
      description: 'A 12-bar blues on the blues scale, bouncing on a figure-8',
      ratios: createSmoothRatios(9, 1, 1.75),
      scale: 'blues',
      rootNote: 'C3',
      maxNote: 'C6',
      bpm: 72,
      chordRatio: 0.5,
      chordProgression: [
        'C7',
        'C7',
        'C7',
        'C7',
        'F7',
        'F7',
        'C7',
        'C7',
        'G7',
        'F7',
        'C7',
        'G7',
      ],
      chordTonesOnly: false,
      ambientOctave: -1,
      easing: 'bounce',
      visualPhasePattern: 'halfSpread',
      spatialPattern: 'wave',
      orbitPath: 'figure8',
    },
    wholeToneHaze: {
      name: 'Whole Tone Haze',
      category: 'harmony',
      description: 'Augmented chords over a whole-tone scale — no home key',
      ratios: createSmoothRatios(14, 0.5, 1.25),
      scale: 'wholeTone',
      rootNote: 'C4',
      maxNote: 'C7',
      bpm: 18,
      chordRatio: 0.5,
      chordProgression: ['Caug', 'Ebaug', 'F#aug', 'Aaug'],
      chordTonesOnly: false,
      ambientOctave: 0,
      visualPhasePattern: 'wave',
      spatialPattern: 'diagonal',
      orbitPath: 'lissajous',
    },

    // ── Textures ───────────────────────────────────────────────
    splitDelay: {
      name: 'Split Delay',
      category: 'textures',
      description: '16 voices, each shadowed by a twin 0.1s behind it',
      manualVoices: createSmoothRatios(16, 1, 1.5)
        .map((r) => {
          const delays = [0.1].map(
            (d, i) => `${(r + 0.01 * i + d).toFixed(2)}+${d}s`,
          );
          return [r.toFixed(2), ...delays].join(', ');
        })
        .join(', '),
      scale: 'major',
      rootNote: 'C4',
      maxNote: 'C7',
      bpm: 10,
      chordRatio: 1,
      chordProgression: ['CMaj7', 'GMaj7', 'AMin7', 'FMaj7'],
      chordTonesOnly: true,
      ambientOctave: 1,
    },
    hirajoshiBloom: {
      name: 'Hirajoshi Bloom',
      category: 'textures',
      description: 'Japanese pentatonic opening out along a rose curve',
      ratios: createSmoothRatios(12, 0.5, 1),
      scale: 'hirajoshi',
      rootNote: 'D4',
      maxNote: 'D7',
      bpm: 8,
      chordRatio: 0.25,
      chordProgression: ['Dsus2', 'Dm', 'Bbadd9', 'Dsus4'],
      chordTonesOnly: false,
      ambientOctave: -1,
      visualPhasePattern: 'spread',
      spatialPattern: 'none',
      orbitPath: 'rose',
    },
    heartbeat: {
      name: 'Heartbeat',
      category: 'textures',
      description: '10 voices tracing hearts, mirrored around the centre',
      ratios: createSmoothRatios(10, 1, 1.2),
      scale: 'majorPentatonic',
      rootNote: 'F3',
      maxNote: 'F6',
      bpm: 30,
      chordRatio: 0.5,
      chordProgression: ['FMaj7', 'Dm7', 'BbMaj7', 'C7'],
      chordTonesOnly: true,
      ambientOctave: 0,
      visualPhasePattern: 'mirror',
      spatialPattern: 'heart',
      orbitPath: 'heart',
    },
    extremelySlow: {
      name: 'Extremely Fricking Slow',
      category: 'textures',
      description: 'One beat per minute. Put it on and walk away.',
      ratios: [0.5, ...createSmoothRatios(10, 1, 1.5)],
      scale: 'lydian',
      rootNote: 'C4',
      maxNote: 'C7',
      bpm: 1,
      chordRatio: 0.5,
      chordProgression: ['CMaj7', 'Am7', 'FMaj7', 'G7'],
      chordTonesOnly: false,
      ambientOctave: 0,
      visualPhasePattern: 'opposites',
      spatialPattern: 'none',
    },

    // ── Extremes ───────────────────────────────────────────────
    beautifulMess: {
      name: 'A Beautiful Mess',
      category: 'extremes',
      description: '25 voices running backwards down a Dorian arc, at 1 BPM',
      ratios: createSmoothRatios(25, 1, 0.7),
      scale: 'dorian',
      rootNote: 'C4',
      maxNote: 'C6',
      bpm: 1,
      chordRatio: 1,
      chordProgression: ['Cm7', 'BbMaj7', 'Gm7', 'FMaj7', 'Em7', 'Dm7', 'Cm7'],
      chordTonesOnly: false,
      ambientOctave: 0,
      visualPhasePattern: 'wave',
      spatialPattern: 'wave',
    },
    butterflyEffect: {
      name: 'Butterfly Effect',
      category: 'extremes',
      description:
        '40 near-identical voices on a butterfly curve, slowly tearing apart',
      ratios: createSmoothRatios(40, 1, 1.05),
      scale: 'harmonicMinor',
      rootNote: 'E3',
      maxNote: 'E6',
      bpm: 24,
      chordRatio: 0.25,
      chordProgression: ['Em7', 'B7', 'Am7', 'B7'],
      chordTonesOnly: false,
      ambientOctave: -1,
      visualPhasePattern: 'spiral',
      spatialPattern: 'scatter',
      orbitPath: 'butterfly',
    },
    aMess: {
      name: 'A Mess',
      category: 'extremes',
      description: '100-voice chromatic chaos at 1 BPM',
      ratios: [0.5, ...createSmoothRatios(100, 1, 2)],
      scale: 'chromatic',
      rootNote: 'C4',
      maxNote: 'C6',
      bpm: 1,
      chordRatio: 2,
      chordProgression: ['C7', 'A7', 'F7', 'G7'],
      chordTonesOnly: true,
      ambientOctave: 0,
      visualPhasePattern: 'spiral',
      spatialPattern: 'spiral',
      easing: 'sine',
    },
    stressTest: {
      name: 'Stress Test (200 Voices)',
      category: 'extremes',
      description: '200 voices at once. How does your computer handle this?',
      ratios: createSmoothRatios(200, 0.5, 2),
      scale: 'chromatic',
      rootNote: 'C3',
      maxNote: 'C7',
      bpm: 120,
      chordRatio: 0.25,
      chordProgression: ['CMaj7', 'Am7', 'FMaj7', 'G7'],
      chordTonesOnly: true,
      ambientOctave: -1,
      visualPhasePattern: 'spiral',
      spatialPattern: 'scatter',
    },
  };

  /**
   * Parse a manual voice definition string.
   * Syntax: comma-separated entries, each is `ratio`, `ratio+Xs`, or
   * with optional `=tag`.
   *
   * - Xs => delay in seconds
   * - Xb => delay in beats
   * Tags:
   * - =prev (or =same) => reuse previous voice note
   * - =D5 / =F#4 / =Bb3 => force explicit note
   * - =ch1 / =ch2 / =ch3 ... => force chord position (1=root,2=third,...)
   *
   * Examples:
   *   "1.0, 1.0+0.2s, 1.05, 1.05+0.2s"
   *   "1, 1.5, 2"
   *   "0.5+1s, 1.0, 1.0+0.5s"
   *
   * @param {string} input
   * @returns {Array<{ratio: number, delaySec: number, delayUnit: string, sameAsPrevious: boolean, noteTag: string|null}>|null}
   */
  function parseManualVoices(input) {
    if (!input || !input.trim()) return null;
    const entries = input
      .split(',')
      .map((s) => s.trim())
      .filter((s) => s.length > 0);
    if (entries.length === 0) return null;

    const result = [];
    for (const entry of entries) {
      // Match: number, optional +number with 's' or 'b' suffix,
      // and optional =tag
      const match = entry.match(
        /^([\d.]+)(?:\+([\d.]+)(s|b))?(?:=([A-Za-z0-9#b]+))?$/i,
      );
      if (!match) {
        console.warn(`Invalid manual voice entry: "${entry}"`);
        continue;
      }
      const ratio = parseFloat(match[1]);
      const delayVal = match[2] ? parseFloat(match[2]) : 0;
      const delayUnit = match[3] || 's';
      const noteTag = match[4] ? match[4] : null;
      const sameAsPrevious =
        noteTag && /^(prev|same)$/i.test(noteTag) ? true : false;
      if (!isNaN(ratio) && ratio > 0) {
        result.push({
          ratio,
          delaySec: delayVal,
          delayUnit,
          sameAsPrevious,
          noteTag,
        });
      }
    }
    return result.length > 0 ? result : null;
  }

  /**
   * Resolve a manual note tag into a concrete note object.
   * Returns null when tag is invalid / not recognized.
   */
  function resolveManualNoteTag(tag, context = {}) {
    if (!tag) return null;
    const {
      prevNote = null,
      chordRootMidi = null,
      chordTypeKey = null,
      maxMidi = null,
    } = context;

    // Previous-note tag
    if (/^(prev|same)$/i.test(tag)) {
      return prevNote ? { ...prevNote } : null;
    }

    // Explicit note tag (e.g. D5, F#4, Bb3)
    if (/^[A-G](?:#|b)?\d?$/i.test(tag)) {
      const midi = noteNameToMidi(tag);
      return midiToNoteObject(midi);
    }

    // Chord position tag (e.g. ch1, chord2)
    const chordPos = tag.match(/^(?:ch|chord)(\d+)$/i);
    if (chordPos && chordRootMidi != null && chordTypeKey) {
      const pos = Math.max(1, parseInt(chordPos[1])) - 1; // zero-based
      const chord = CHORD_TYPES[chordTypeKey] || CHORD_TYPES.major;
      const intervals = chord.intervals;
      const toneIdx = pos % intervals.length;
      const octIdx = Math.floor(pos / intervals.length);
      let midi = chordRootMidi + intervals[toneIdx] + octIdx * 12;

      if (maxMidi != null) {
        while (midi > maxMidi) midi -= 12;
      }

      return midiToNoteObject(midi);
    }

    return null;
  }

  /**
   * Build a full voice configuration from a preset key.
   */
  function buildVoiceConfig(presetKey) {
    const preset = PRESETS[presetKey];
    if (!preset) return null;

    // Parse manual voices if defined
    const manualParsed = preset.manualVoices
      ? parseManualVoices(preset.manualVoices)
      : null;

    // Determine ratios and delays
    let ratios, delays, sameNoteFlags, manualNoteTags;
    if (manualParsed) {
      ratios = manualParsed.map((v) => v.ratio);
      const bpm = preset.bpm || 60;
      delays = manualParsed.map((v) => {
        if (v.delayUnit === 'b') return (v.delaySec * 60) / bpm;
        return v.delaySec;
      });
      sameNoteFlags = manualParsed.map((v) => !!v.sameAsPrevious);
      manualNoteTags = manualParsed.map((v) => v.noteTag || null);
    } else {
      ratios = preset.ratios;
      delays = ratios.map(() => 0);
      sameNoteFlags = ratios.map(() => false);
      manualNoteTags = ratios.map(() => null);
    }

    const count = ratios.length;
    const rootMidi = noteNameToMidi(preset.rootNote);
    const maxMidi = preset.maxNote ? noteNameToMidi(preset.maxNote) : null;

    // If chordTonesOnly and we have a chord progression, use the first chord's tones
    let notes;
    if (
      preset.chordTonesOnly &&
      preset.chordProgression &&
      preset.chordProgression.length > 0
    ) {
      const parsed = parseChordSymbol(preset.chordProgression[0]);
      notes = getVoiceNotesFromChord(
        parsed.rootMidi,
        parsed.chordTypeKey,
        count,
        maxMidi,
      );
    } else {
      notes = getNotesForScale(rootMidi, preset.scale, count, maxMidi);
    }
    const colors = generateColors(count);
    const phaseOffsets = generatePhaseOffsets(
      count,
      preset.visualPhasePattern || 'none',
    );
    const spatialOffsets = generateSpatialOffsets(
      count,
      preset.spatialPattern || 'none',
    );
    const chordContext =
      preset.chordProgression && preset.chordProgression.length > 0
        ? parseChordSymbol(preset.chordProgression[0])
        : null;

    const finalNotes = [];
    for (let i = 0; i < notes.length; i++) {
      const defaultNote = notes[i];
      const tag = manualNoteTags[i];
      const prev = i > 0 ? finalNotes[i - 1] : null;

      const tagged = resolveManualNoteTag(tag, {
        prevNote: prev,
        chordRootMidi: chordContext ? chordContext.rootMidi : null,
        chordTypeKey: chordContext ? chordContext.chordTypeKey : null,
        maxMidi,
      });

      if (tagged) {
        finalNotes.push(tagged);
      } else if (sameNoteFlags[i] && i > 0) {
        finalNotes.push({ ...prev });
      } else {
        finalNotes.push(defaultNote);
      }
    }

    return {
      preset,
      voices: ratios.map((ratio, i) => ({
        ratio,
        note: finalNotes[i],
        color: colors[i],
        visualPhaseOffset: phaseOffsets[i],
        spatialOffset: spatialOffsets[i],
        startDelay: delays[i] || 0,
        sameNoteAsPrevious: sameNoteFlags[i] || false,
        manualNoteTag: manualNoteTags[i] || null,
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
    PHASE_PATTERNS,
    SPATIAL_PATTERNS,
    ORBIT_SHAPES,
    PRESETS,
    PRESET_CATEGORIES,
    noteNameToMidi,
    midiToFrequency,
    midiToNoteName,
    getNotesForScale,
    getChordNotes,
    getVoiceNotesFromChord,
    parseChordSymbol,
    generateColors,
    generatePhaseOffsets,
    generateSpatialOffsets,
    getOrbitShapePosition,
    buildVoiceConfig,
    createSmoothRatios,
    parseManualVoices,
    resolveManualNoteTag,
    getPolyrhythmResolution,
  };
})();
