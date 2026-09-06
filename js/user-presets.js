/**
 * user-presets.js — Persistence for presets the user saves themselves.
 *
 * A user preset is an ordinary preset object (same shape as Config.PRESETS)
 * plus a little bookkeeping:
 *   id        stable identifier; also the Config.PRESETS key it merges under
 *   savedAt   epoch ms, used for ordering
 *   vis       snapshot of the visual settings that were active when saved
 *   scene     scene key that was active when saved
 *
 * Everything lives in one localStorage entry so import/export is a single
 * JSON blob.
 */

const UserPresets = (() => {
  const STORAGE_KEY = 'polyrhythm.userPresets.v1';
  const KEY_PREFIX = 'user:';
  const FORMAT = 'polyrhythm-presets';

  /** Fields copied verbatim when a preset is saved or imported. */
  const PRESET_FIELDS = [
    'name',
    'description',
    'ratios',
    'manualVoices',
    'scale',
    'rootNote',
    'maxNote',
    'bpm',
    'chordRatio',
    'chordProgression',
    'chordTonesOnly',
    'connectNeighbors',
    'ambientOctave',
    'visualPhasePattern',
    'spatialPattern',
    'orbitPath',
    'easing',
  ];

  let cache = null;

  /** True when localStorage is usable — private modes and file:// refuse. */
  function storageAvailable() {
    try {
      const probe = '__pp_probe__';
      window.localStorage.setItem(probe, '1');
      window.localStorage.removeItem(probe);
      return true;
    } catch (err) {
      return false;
    }
  }

  const available = storageAvailable();

  /** Read the whole list from storage, tolerating anything malformed. */
  function readAll() {
    if (cache) return cache;
    if (!available) {
      cache = [];
      return cache;
    }
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      const parsed = raw ? JSON.parse(raw) : [];
      cache = Array.isArray(parsed) ? parsed.filter(isValid) : [];
    } catch (err) {
      console.warn('Could not read saved presets:', err);
      cache = [];
    }
    return cache;
  }

  function writeAll(list) {
    cache = list;
    if (!available) return false;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
      return true;
    } catch (err) {
      console.warn('Could not save presets:', err);
      return false;
    }
  }

  function isValid(p) {
    return (
      p &&
      typeof p === 'object' &&
      typeof p.name === 'string' &&
      (Array.isArray(p.ratios) || typeof p.manualVoices === 'string')
    );
  }

  function makeId() {
    return (
      'p' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7)
    );
  }

  /** Strip a preset down to the persisted fields. */
  function sanitize(source) {
    const out = {};
    PRESET_FIELDS.forEach((f) => {
      if (source[f] !== undefined) out[f] = source[f];
    });
    out.category = 'user';
    return out;
  }

  // ── Public API ──

  /** Newest first. */
  function list() {
    return readAll()
      .slice()
      .sort((a, b) => (b.savedAt || 0) - (a.savedAt || 0));
  }

  function get(id) {
    return readAll().find((p) => p.id === id) || null;
  }

  /** The key a user preset is registered under in Config.PRESETS. */
  function configKey(id) {
    return KEY_PREFIX + id;
  }

  function isUserKey(key) {
    return typeof key === 'string' && key.startsWith(KEY_PREFIX);
  }

  function idFromKey(key) {
    return isUserKey(key) ? key.slice(KEY_PREFIX.length) : null;
  }

  function findByName(name) {
    const wanted = String(name).trim().toLowerCase();
    return (
      readAll().find((p) => p.name.trim().toLowerCase() === wanted) || null
    );
  }

  /**
   * Save a preset.  Pass an existing `id` to overwrite that entry in place,
   * keeping its identity (and therefore any dropdown selection).
   * @returns {object} the stored preset
   */
  function save(preset, id = null) {
    const list = readAll().slice();
    const record = sanitize(preset);
    record.vis = preset.vis ? { ...preset.vis } : undefined;
    record.scene = preset.scene || undefined;
    record.savedAt = Date.now();

    const existingIdx = id ? list.findIndex((p) => p.id === id) : -1;
    if (existingIdx >= 0) {
      record.id = id;
      list[existingIdx] = record;
    } else {
      record.id = makeId();
      list.push(record);
    }
    writeAll(list);
    return record;
  }

  function rename(id, name) {
    const list = readAll().slice();
    const target = list.find((p) => p.id === id);
    if (!target) return null;
    target.name = String(name).trim() || target.name;
    writeAll(list);
    return target;
  }

  function remove(id) {
    const list = readAll().filter((p) => p.id !== id);
    writeAll(list);
  }

  function clear() {
    writeAll([]);
  }

  /** Register every saved preset into Config.PRESETS under its user: key. */
  function mergeIntoConfig(configPresets) {
    // Drop stale user entries first so deletes actually take effect.
    Object.keys(configPresets).forEach((k) => {
      if (isUserKey(k)) delete configPresets[k];
    });
    readAll().forEach((p) => {
      configPresets[configKey(p.id)] = p;
    });
  }

  /** JSON text for download / clipboard. */
  function exportJSON() {
    return JSON.stringify(
      { format: FORMAT, version: 1, presets: readAll() },
      null,
      2,
    );
  }

  /**
   * Import presets from exported JSON (or a bare array).  Names that already
   * exist get a " (2)", " (3)" … suffix rather than overwriting.
   * @returns {{added: number, error: string|null}}
   */
  function importJSON(text) {
    let parsed;
    try {
      parsed = JSON.parse(text);
    } catch (err) {
      return { added: 0, error: 'That file is not valid JSON.' };
    }

    const incoming = Array.isArray(parsed)
      ? parsed
      : Array.isArray(parsed.presets)
        ? parsed.presets
        : null;
    if (!incoming) {
      return { added: 0, error: 'No presets found in that file.' };
    }

    const list = readAll().slice();
    const taken = new Set(list.map((p) => p.name.trim().toLowerCase()));
    let added = 0;

    incoming.forEach((raw) => {
      if (!isValid(raw)) return;
      const record = sanitize(raw);
      record.vis = raw.vis ? { ...raw.vis } : undefined;
      record.scene = raw.scene || undefined;
      record.id = makeId();
      record.savedAt = Date.now();

      let name = record.name.trim();
      let n = 2;
      while (taken.has(name.toLowerCase())) {
        name = `${record.name.trim()} (${n++})`;
      }
      record.name = name;
      taken.add(name.toLowerCase());

      list.push(record);
      added++;
    });

    if (!added) return { added: 0, error: 'No usable presets in that file.' };
    writeAll(list);
    return { added, error: null };
  }

  return {
    available,
    KEY_PREFIX,
    list,
    get,
    save,
    rename,
    remove,
    clear,
    findByName,
    configKey,
    isUserKey,
    idFromKey,
    mergeIntoConfig,
    exportJSON,
    importJSON,
  };
})();
