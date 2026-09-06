/**
 * midi-layer.js — Web MIDI output for polyrhythms.
 *
 * Mirrors the AudioLayer API surface: build it once, feed it the voice array
 * every frame with `update(voices)`, and each triggered voice is sent to the
 * selected MIDI output as a note-on / note-off pair.
 *
 * Note-offs are scheduled with setTimeout rather than timestamped `send()`
 * calls so that a retriggered note can cancel its own pending off — a
 * timestamped off already handed to the browser cannot be recalled, and would
 * cut the retriggered note short.  A few ms of timer jitter on note-off is
 * inaudible; a truncated note is not.
 *
 * Every sounding note is tracked so the layer can send explicit note-offs
 * (plus a CC 123 "all notes off") when it is disabled, when playback pauses,
 * or when the output device changes — otherwise external gear is left with
 * stuck notes.
 */

class MidiLayer {
  constructor() {
    /** @type {MIDIAccess|null} */
    this._access = null;
    /** @type {MIDIOutput|null} Currently selected output port */
    this._output = null;
    /** @type {string|null} Selected port id (kept across hot-plug) */
    this._outputId = null;

    /** Web MIDI supported by this browser at all */
    this.supported = typeof navigator !== 'undefined' && !!navigator.requestMIDIAccess;
    /** Access granted and ports enumerated */
    this.initialized = false;
    /** User-facing on/off switch */
    this.enabled = false;

    // ── Settings ──
    this.channel = 1; // 1–16, base channel
    this.channelMode = 'single'; // 'single' | 'spread' (voice i → own channel)
    this.velocity = 100; // 1–127
    this.gateMs = 200; // note length in milliseconds
    this.transpose = 0; // semitones
    this.sendPad = false; // mirror the ambient chord to a pad channel
    this.padChannel = 2; // 1–16
    this.padVelocity = 64;
    this.sustain = false; // hold CC 64 under the voice channels
    this.repedalOnChord = true; // lift + re-press the pedal at chord changes

    /**
     * Sounding notes, keyed "channel:note" → { timer, generation }.
     * @type {Map<string, {timer: number, generation: number}>}
     */
    this._active = new Map();
    this._generation = 0;

    /** Channels currently holding CC 64 down. @type {Set<number>} */
    this._pedalDown = new Set();

    /** Notified when the port list changes (hot-plug). @type {Function|null} */
    this.onPortsChanged = null;
  }

  /* ------------------------------------------------------------------ */
  /*  Initialisation                                                     */
  /* ------------------------------------------------------------------ */

  /**
   * Request MIDI access from the browser.  Safe to call more than once.
   * @returns {Promise<boolean>} true if access was granted
   */
  async init() {
    if (!this.supported) return false;
    if (this.initialized) return true;

    try {
      this._access = await navigator.requestMIDIAccess({ sysex: false });
    } catch (e) {
      console.warn('MIDI access denied or unavailable:', e);
      return false;
    }

    this.initialized = true;

    // Hot-plug: re-resolve the selected port and let the UI refresh its list
    this._access.onstatechange = () => {
      this._resolveOutput();
      if (this.onPortsChanged) this.onPortsChanged(this.getOutputs());
    };

    return true;
  }

  /* ------------------------------------------------------------------ */
  /*  Port selection                                                     */
  /* ------------------------------------------------------------------ */

  /**
   * List available output ports.
   * @returns {Array<{id: string, name: string}>}
   */
  getOutputs() {
    if (!this._access) return [];
    const list = [];
    this._access.outputs.forEach((port) => {
      list.push({
        id: port.id,
        name: port.name || port.id,
      });
    });
    return list;
  }

  /**
   * Select the output port to send to.  Silences the previous port first.
   * @param {string|null} id — port id, or null/'' for none
   */
  setOutput(id) {
    if (id === this._outputId) return;
    this.allNotesOff();
    this._outputId = id || null;
    this._resolveOutput();
  }

  /** Re-look-up the port object for the selected id (survives reconnects). */
  _resolveOutput() {
    if (!this._access || !this._outputId) {
      this._output = null;
      return;
    }
    const port = this._access.outputs.get(this._outputId);
    this._output = port || null;
  }

  /** @returns {string|null} Name of the active output, if any. */
  getOutputName() {
    return this._output ? this._output.name || this._output.id : null;
  }

  /** @returns {boolean} True when notes will actually be sent. */
  get isSending() {
    return this.enabled && !!this._output;
  }

  /* ------------------------------------------------------------------ */
  /*  Settings                                                           */
  /* ------------------------------------------------------------------ */

  /** Enable or disable output.  Disabling silences anything still sounding. */
  setEnabled(on) {
    const next = !!on;
    if (next === this.enabled) return;
    if (!next) this.allNotesOff();
    this.enabled = next;
  }

  // Note: channel, mode and transpose changes need no panic — pending
  // note-offs are keyed by the channel and note actually sent, so anything
  // already sounding is still released correctly under the new setting.

  /** @param {number} ch 1–16 */
  setChannel(ch) {
    const next = Math.min(16, Math.max(1, Math.round(ch)));
    if (next === this.channel) return;
    this._pedalUp(); // don't strand a held pedal on the channel we're leaving
    this.channel = next;
  }

  /** @param {'single'|'spread'} mode */
  setChannelMode(mode) {
    const next = mode === 'spread' ? 'spread' : 'single';
    if (next === this.channelMode) return;
    this._pedalUp();
    this.channelMode = next;
  }

  /** @param {number} v 1–127 */
  setVelocity(v) {
    this.velocity = Math.min(127, Math.max(1, Math.round(v)));
  }

  /** @param {number} ms note length */
  setGate(ms) {
    this.gateMs = Math.min(4000, Math.max(10, Math.round(ms)));
  }

  /** @param {number} semitones */
  setTranspose(semitones) {
    this.transpose = Math.round(semitones);
  }

  /**
   * Hold the sustain pedal (CC 64) under the voice channels.  Turning it off
   * lifts the pedal, which releases everything it was holding.
   */
  setSustain(on) {
    const next = !!on;
    if (next === this.sustain) return;
    this.sustain = next;
    if (!next) this._pedalUp();
  }

  /** Lift and re-press the pedal at each chord change. */
  setRepedalOnChord(on) {
    this.repedalOnChord = !!on;
  }

  /** Mirror ambient chord changes to a separate pad channel. */
  setSendPad(on) {
    const next = !!on;
    if (next === this.sendPad) return;
    if (!next) this._padOff();
    this.sendPad = next;
    // Taking this channel over for the pad: drop any pedal we are already
    // holding there, or the pad's releases will go unheard.
    if (next) this._pedalUpOn(this.padChannel);
  }

  /** @param {number} ch 1–16 */
  setPadChannel(ch) {
    const next = Math.min(16, Math.max(1, Math.round(ch)));
    if (next === this.padChannel) return;
    this._padOff();
    this.padChannel = next;
    if (this.sendPad) this._pedalUpOn(this.padChannel);
  }

  /* ------------------------------------------------------------------ */
  /*  Per-frame update                                                   */
  /* ------------------------------------------------------------------ */

  /**
   * Send note-ons for every voice that triggered this frame.
   * @param {Array<{id: number, triggered: boolean, note: {midi: number}}>} voices
   */
  update(voices) {
    if (!this.isSending) return;

    for (let i = 0; i < voices.length; i++) {
      const voice = voices[i];
      if (!voice.triggered) continue;

      const midi = voice.note && voice.note.midi;
      if (typeof midi !== 'number') continue;

      const note = midi + this.transpose;
      if (note < 0 || note > 127) continue; // outside MIDI range — skip

      const channel =
        this.channelMode === 'spread'
          ? ((this.channel - 1 + (voice.id ?? i)) % 16) + 1
          : this.channel;

      this._noteOn(channel, note, this.velocity, this.gateMs);
    }
  }

  /* ------------------------------------------------------------------ */
  /*  Sustain pedal                                                      */
  /* ------------------------------------------------------------------ */

  /**
   * Call at each chord change.  With re-pedalling on, the pedal lifts so the
   * outgoing harmony stops ringing; the next note-on presses it down again.
   * That lazy re-press is what keeps the pedal in step with the music — the
   * pedal comes back down with the next note rather than during the gap.
   */
  repedal() {
    if (!this.isSending || !this.sustain || !this.repedalOnChord) return;
    this._pedalUp();
  }

  /**
   * Press the pedal on one channel, unless it is already down there.
   * @param {number} channel 1–16
   */
  _pedalPress(channel) {
    if (!this.sustain || this._pedalDown.has(channel)) return;
    // Never hold the pedal on the pad channel.  Spread mode can land a voice
    // there (base channel 1, voice 1 → channel 2), and a pedal held there
    // swallows the note-offs the pad relies on to release — every chord then
    // stacks on the last one instead of replacing it.
    if (this.sendPad && channel === this.padChannel) return;
    this._send([0xb0 | (channel - 1), 64, 127]);
    this._pedalDown.add(channel);
  }

  /**
   * Lift the pedal on one channel, if we are holding it there.
   * @param {number} channel 1–16
   */
  _pedalUpOn(channel) {
    if (!this._pedalDown.has(channel)) return;
    this._send([0xb0 | (channel - 1), 64, 0]);
    this._pedalDown.delete(channel);
  }

  /** Lift the pedal on every channel currently holding it. */
  _pedalUp() {
    for (const channel of this._pedalDown) {
      this._send([0xb0 | (channel - 1), 64, 0]);
    }
    this._pedalDown.clear();
  }

  /* ------------------------------------------------------------------ */
  /*  Chord pad                                                          */
  /* ------------------------------------------------------------------ */

  /**
   * Mirror an ambient chord onto the pad channel as sustained notes.
   * Previous pad notes are released first, so calls can simply follow the
   * chord progression.
   * @param {Array<{midi: number}>} notes
   * @param {number} [transposeSemitones=0]
   */
  sendChord(notes, transposeSemitones = 0) {
    if (!this.isSending || !this.sendPad || !notes) return;

    this._padOff();

    for (const n of notes) {
      if (!n || typeof n.midi !== 'number') continue;
      const note = n.midi + transposeSemitones + this.transpose;
      if (note < 0 || note > 127) continue;
      // Gate 0 → sustain until the next chord (or a panic) releases it
      this._noteOn(this.padChannel, note, this.padVelocity, 0, false);
    }
  }

  /** Release every note sounding on the pad channel. */
  _padOff() {
    const prefix = `${this.padChannel}:`;
    for (const key of Array.from(this._active.keys())) {
      if (key.startsWith(prefix)) {
        const note = parseInt(key.slice(prefix.length), 10);
        this._noteOff(this.padChannel, note);
      }
    }
  }

  /* ------------------------------------------------------------------ */
  /*  Raw note sending                                                   */
  /* ------------------------------------------------------------------ */

  /**
   * Send a note-on and schedule its note-off.
   * @param {number} channel 1–16
   * @param {number} note 0–127
   * @param {number} velocity 1–127
   * @param {number} gateMs — 0 to sustain until explicitly released
   * @param {boolean} [pedal=true] — whether the sustain pedal applies here.
   *        Pad notes opt out: they already sustain until the next chord
   *        releases them, and a held pedal would defeat that release.
   */
  _noteOn(channel, note, velocity, gateMs, pedal = true) {
    const key = `${channel}:${note}`;

    if (pedal) this._pedalPress(channel);

    // Retrigger: release the sounding note and cancel its pending off so the
    // stale timer cannot cut the new note short.
    const existing = this._active.get(key);
    if (existing) {
      if (existing.timer) clearTimeout(existing.timer);
      this._send([0x80 | (channel - 1), note, 0]);
    }

    const generation = ++this._generation;
    this._send([0x90 | (channel - 1), note, velocity]);

    let timer = 0;
    if (gateMs > 0) {
      timer = setTimeout(() => {
        // Only release if this note-on is still the one sounding
        const current = this._active.get(key);
        if (current && current.generation === generation) {
          this._noteOff(channel, note);
        }
      }, gateMs);
    }

    this._active.set(key, { timer, generation });
  }

  /**
   * Release a note and stop tracking it.
   * @param {number} channel 1–16
   * @param {number} note 0–127
   */
  _noteOff(channel, note) {
    const key = `${channel}:${note}`;
    const entry = this._active.get(key);
    if (entry && entry.timer) clearTimeout(entry.timer);
    this._active.delete(key);
    this._send([0x80 | (channel - 1), note, 0]);
  }

  /**
   * Send raw MIDI bytes, swallowing errors from a port that vanished.
   * @param {number[]} bytes
   */
  _send(bytes) {
    if (!this._output) return;
    try {
      this._output.send(bytes);
    } catch (e) {
      // Port disconnected mid-send — drop it and let statechange re-resolve
      console.warn('MIDI send failed:', e);
    }
  }

  /* ------------------------------------------------------------------ */
  /*  Panic / Dispose                                                    */
  /* ------------------------------------------------------------------ */

  /**
   * Release everything: explicit note-offs for tracked notes, plus a
   * CC 123 (all notes off) on every channel that was used.
   *
   * With nothing sounding this sends nothing at all, so it is cheap to call
   * defensively (on pause, on rebuild, on device change).  A held pedal
   * counts as sounding — its notes may have outlived their gates, so their
   * only release is the pedal lift.
   */
  allNotesOff() {
    if (this._active.size === 0 && this._pedalDown.size === 0) return;

    const channels = new Set(this._pedalDown);

    for (const [key, entry] of this._active) {
      if (entry.timer) clearTimeout(entry.timer);
      const sep = key.indexOf(':');
      const channel = parseInt(key.slice(0, sep), 10);
      const note = parseInt(key.slice(sep + 1), 10);
      channels.add(channel);
      this._send([0x80 | (channel - 1), note, 0]);
    }
    this._active.clear();

    // Lift before CC 123 — a held pedal outlasts an all-notes-off on much gear
    this._pedalUp();

    // Belt and braces for gear that missed a note-off
    channels.add(this.channel);
    if (this.sendPad) channels.add(this.padChannel);
    for (const channel of channels) {
      this._send([0xb0 | (channel - 1), 123, 0]);
    }
  }

  /** Silence output and drop the port reference. */
  dispose() {
    this.allNotesOff();
    this.enabled = false;
    this._output = null;
    if (this._access) this._access.onstatechange = null;
  }
}
