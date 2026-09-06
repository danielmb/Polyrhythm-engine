/**
 * main.js — Entry point. Wires TimingEngine, AudioLayer, and Renderer together.
 * Handles UI events and the p5.js sketch lifecycle.
 */

(function () {
  // ── State ──

  // Saved presets are merged into Config.PRESETS up front so everything
  // downstream (buildVoiceConfig, retuneVoices, the debug overlay …) treats
  // them exactly like the built-in ones.
  UserPresets.mergeIntoConfig(Config.PRESETS);

  const firstPresetKey = Object.keys(Config.PRESETS)[0];
  let engine = null;
  let audioLayer = null;
  const midiLayer = new MidiLayer();
  let renderer = null;
  let currentPresetKey = firstPresetKey;
  let currentSceneKey = 'circular-orbits';
  let currentChordIndex = 0;
  let ambientLayer;
  let currentResolutionBeats = 1;
  let chordChangeGlow = 0;
  let chordChangeEffect = true;
  let started = false;
  let internalSynthMuted = false;

  /**
   * Apply the volume slider to the internal synth layers, honouring the
   * "mute internal synth" switch used when routing to external MIDI gear.
   */
  function applyVolume() {
    const vol = internalSynthMuted ? 0 : parseFloat(volumeSlider.value);
    if (audioLayer) audioLayer.setVolume(vol);
    if (ambientLayer) ambientLayer.setVolume(vol);
  }

  /**
   * Play a chord on every pad-capable layer (internal ambient pad + MIDI).
   * @param {Array<{midi: number}>} padNotes
   * @param {number} transposeSemitones
   */
  function playPad(padNotes, transposeSemitones) {
    if (ambientLayer) ambientLayer.playChord(padNotes, transposeSemitones);
    midiLayer.sendChord(padNotes, transposeSemitones);
  }

  /**
   * Re-tune voice notes based on a parsed chord and the current mode.
   * Uses preset.chordTonesOnly as the source of truth (synced with checkbox).
   */
  function retuneVoices(parsed, preset, voiceCount) {
    const maxMidi = preset.maxNote
      ? Config.noteNameToMidi(preset.maxNote)
      : null;
    const useChordTones = preset.chordTonesOnly || false;

    let notes;
    if (useChordTones) {
      notes = Config.getVoiceNotesFromChord(
        parsed.rootMidi,
        parsed.chordTypeKey,
        voiceCount,
        maxMidi,
      );
    } else {
      notes = Config.getNotesForScale(
        parsed.rootMidi,
        preset.scale,
        voiceCount,
        maxMidi,
      );
    }
    const nextNotes = [];
    engine.voices.forEach((v, i) => {
      const defaultNote = notes[i];
      const prev = i > 0 ? nextNotes[i - 1] : null;
      const tagged = Config.resolveManualNoteTag(v.manualNoteTag, {
        prevNote: prev,
        chordRootMidi: parsed.rootMidi,
        chordTypeKey: parsed.chordTypeKey,
        maxMidi,
      });

      if (tagged) {
        nextNotes.push(tagged);
      } else if (v.sameNoteAsPrevious && i > 0) {
        nextNotes.push({ ...prev });
      } else {
        nextNotes.push(defaultNote);
      }
    });

    engine.voices.forEach((v, i) => {
      v.note = nextNotes[i];
    });
  }

  // ── DOM References ──
  const startOverlay = document.getElementById('start-overlay');
  const startBtn = document.getElementById('start-btn');
  const controlsEl = document.getElementById('controls');
  const controlsToggle = document.getElementById('controls-toggle');
  const controlsPanel = document.getElementById('controls-panel');
  const presetSelect = document.getElementById('preset-select');
  const presetDescription = document.getElementById('preset-description');
  const sceneSelect = document.getElementById('scene-select');
  const bpmSlider = document.getElementById('bpm-slider');
  const bpmNumber = document.getElementById('bpm-number');
  const bpmValue = document.getElementById('bpm-value');
  const volumeSlider = document.getElementById('volume-slider');
  const volumeValue = document.getElementById('volume-value');
  const pauseBtn = document.getElementById('pause-btn');
  const infoDisplay = document.getElementById('info-display');
  const infoPreset = document.getElementById('info-preset');
  const infoElapsed = document.getElementById('info-elapsed');

  // ── Preset dropdown ──
  /**
   * Rebuild the dropdown, grouping presets by category in the order the
   * categories are declared.  Called again whenever the saved-preset list
   * changes, so it must be safe to run repeatedly.
   */
  function rebuildPresetDropdown() {
    presetSelect.innerHTML = '';

    const groups = new Map();
    Object.entries(Config.PRESETS).forEach(([key, preset]) => {
      const cat = Config.PRESET_CATEGORIES[preset.category]
        ? preset.category
        : 'custom';
      if (!groups.has(cat)) groups.set(cat, []);
      groups.get(cat).push([key, preset]);
    });

    Object.keys(Config.PRESET_CATEGORIES).forEach((cat) => {
      const entries = groups.get(cat);
      if (!entries || entries.length === 0) return;
      const group = document.createElement('optgroup');
      group.label = Config.PRESET_CATEGORIES[cat];
      entries.forEach(([key, preset]) => {
        const opt = document.createElement('option');
        opt.value = key;
        opt.textContent = preset.name;
        group.appendChild(opt);
      });
      presetSelect.appendChild(group);
    });

    presetSelect.value = currentPresetKey;
  }

  /** Show the active preset's one-line description under the dropdown. */
  function updatePresetDescription() {
    if (!presetDescription) return;
    const preset = Config.PRESETS[currentPresetKey];
    presetDescription.textContent = preset?.description || '';
  }

  /** Refresh the corner label with the active preset name and current chord. */
  function updateInfoPreset() {
    const preset = Config.PRESETS[currentPresetKey];
    if (!preset) return;
    const symbol = preset.chordProgression?.[currentChordIndex];
    infoPreset.textContent = symbol
      ? `${preset.name} (${Config.parseChordSymbol(symbol).displayName})`
      : preset.name;
  }

  rebuildPresetDropdown();
  updatePresetDescription();

  // ── Build engine + audio from preset ──
  function buildFromPreset(presetKey) {
    console.log('Build from preset', presetKey);
    const cfg = Config.buildVoiceConfig(presetKey);
    if (!cfg) return;

    currentPresetKey = presetKey;

    if (!engine) {
      engine = new TimingEngine({
        bpm: cfg.preset.bpm,
        voiceConfigs: cfg.voices,
        chordRatio: cfg.preset.chordRatio || 0,
      });
    } else {
      engine.chordRatio = cfg.preset.chordRatio || 0;
      engine.setVoices(cfg.voices);
      engine.setBpm(cfg.preset.bpm);
    }
    currentChordIndex = 0;

    // Update BPM slider to match preset
    bpmSlider.value = cfg.preset.bpm;
    bpmNumber.value = cfg.preset.bpm;
    bpmValue.textContent = cfg.preset.bpm;

    // Update info
    updateInfoPreset();
    presetSelect.value = presetKey;
    updatePresetDescription();

    // Sync UI controls with preset
    const ctoCheckbox = document.getElementById('adv-chord-tones-only');
    const scaleDropdown = document.getElementById('adv-scale');
    const ofsDropdown = document.getElementById('adv-offset-pattern');
    if (ctoCheckbox) {
      ctoCheckbox.checked = !!cfg.preset.chordTonesOnly;
      if (scaleDropdown) {
        scaleDropdown.disabled = ctoCheckbox.checked;
        scaleDropdown.style.opacity = ctoCheckbox.checked ? '0.4' : '1';
      }
    }
    if (ofsDropdown) {
      ofsDropdown.value = cfg.preset.visualPhasePattern || 'none';
    }
    const spatDropdown = document.getElementById('adv-spatial-pattern');
    if (spatDropdown) {
      spatDropdown.value = cfg.preset.spatialPattern || 'none';
    }
    const orbitPathDropdown = document.getElementById('adv-orbit-path');
    if (orbitPathDropdown) {
      orbitPathDropdown.value = cfg.preset.orbitPath || 'circle';
    }
    const ambOctSlider = document.getElementById('adv-ambient-octave');
    const ambOctVal = document.getElementById('adv-ambient-octave-val');
    if (ambOctSlider) {
      const oct = cfg.preset.ambientOctave ?? 0;
      ambOctSlider.value = oct;
      if (ambOctVal) ambOctVal.textContent = oct > 0 ? `+${oct}` : oct;
    }

    // Sync Generator fields
    const parsedManualForPreset = cfg.preset.manualVoices
      ? Config.parseManualVoices(cfg.preset.manualVoices)
      : null;
    const effectiveRatios = parsedManualForPreset
      ? parsedManualForPreset.map((v) => v.ratio)
      : cfg.preset.ratios;

    const voiceCountSlider = document.getElementById('adv-voice-count');
    const voiceCountVal = document.getElementById('adv-voice-count-val');
    if (voiceCountSlider) {
      voiceCountSlider.value = effectiveRatios.length;
      if (voiceCountVal) voiceCountVal.textContent = effectiveRatios.length;
    }
    const ratioStart = document.getElementById('adv-ratio-start');
    const ratioEnd = document.getElementById('adv-ratio-end');
    if (ratioStart && effectiveRatios.length > 0) {
      ratioStart.value = effectiveRatios[0].toFixed(2);
    }
    if (ratioEnd && effectiveRatios.length > 1) {
      ratioEnd.value = effectiveRatios[effectiveRatios.length - 1].toFixed(2);
    }
    const easingSelect = document.getElementById('adv-easing');
    if (easingSelect) {
      easingSelect.value = cfg.preset.easing || 'sine';
    }

    // Sync Manual Voices field
    const manualVoicesEl = document.getElementById('adv-manual-voices');
    if (manualVoicesEl) {
      manualVoicesEl.value = cfg.preset.manualVoices || '';
    }

    // Sync Harmony fields
    if (scaleDropdown) {
      scaleDropdown.value = cfg.preset.scale || 'chromatic';
    }
    const rootInput = document.getElementById('adv-root');
    if (rootInput) {
      rootInput.value = cfg.preset.rootNote || 'C4';
    }
    const maxNoteInput = document.getElementById('adv-max-note');
    if (maxNoteInput) {
      maxNoteInput.value = cfg.preset.maxNote || '';
    }

    // Sync Progression fields
    const chordRatioSlider = document.getElementById('adv-chord-ratio');
    const chordRatioNumber = document.getElementById('adv-chord-ratio-number');
    const chordRatioVal = document.getElementById('adv-chord-ratio-val');
    if (chordRatioSlider) {
      chordRatioSlider.value = cfg.preset.chordRatio ?? 1;
      if (chordRatioVal) chordRatioVal.textContent = cfg.preset.chordRatio ?? 1;
    }
    if (chordRatioNumber) {
      chordRatioNumber.value = cfg.preset.chordRatio ?? 1;
    }
    const progInput = document.getElementById('adv-progression');
    if (progInput) {
      progInput.value = (cfg.preset.chordProgression || []).join(' ');
    }

    // Sync Connect Neighbors
    const connectCheckbox = document.getElementById('adv-connect-neighbors');
    if (connectCheckbox) {
      connectCheckbox.checked = cfg.preset.connectNeighbors !== false;
    }

    return cfg;
  }

  // ── Start ──
  startBtn.addEventListener('click', async () => {
    if (started) return;
    started = true;

    // Init audio context
    await Tone.start();

    // Build engine
    const cfg = buildFromPreset(currentPresetKey);

    // Build audio layer
    audioLayer = new AudioLayer();
    await audioLayer.init(engine.voices);

    // Build ambient layer
    ambientLayer = new AmbientLayer();
    applyVolume();

    // Trigger initial chord if exists
    const preset = Config.PRESETS[currentPresetKey];
    if (preset?.chordProgression?.length > 0) {
      const parsed = Config.parseChordSymbol(preset.chordProgression[0]);
      const padNotes = Config.getChordNotes(
        parsed.rootMidi,
        parsed.chordTypeKey,
      );
      playPad(padNotes, (preset.ambientOctave ?? 0) * 12);

      // Re-tune voices
      retuneVoices(parsed, preset, engine.voices.length);
    }

    // Build renderer
    renderer = new Renderer();

    // Create p5 sketch
    const sketch = (p) => {
      p.setup = () => {
        const canvas = p.createCanvas(p.windowWidth, p.windowHeight);
        canvas.parent(document.body);
        p.colorMode(p.HSB, 360, 100, 100, 100);
        p.smooth();

        // Initialize default scene
        renderer.setScene(currentSceneKey, engine.voices, p.width, p.height);
      };

      p.draw = () => {
        // Update timing engine
        engine.update();

        // ── Handle Chord Changes ──
        if (engine.chordTriggered) {
          const preset = Config.PRESETS[currentPresetKey];
          if (preset.chordProgression && preset.chordProgression.length > 0) {
            currentChordIndex =
              (currentChordIndex + 1) % preset.chordProgression.length;
            const chordSymbol = preset.chordProgression[currentChordIndex];
            const parsed = Config.parseChordSymbol(chordSymbol);
            const maxMidi = preset.maxNote
              ? Config.noteNameToMidi(preset.maxNote)
              : null;

            // Re-tune all voices
            retuneVoices(parsed, preset, engine.voices.length);

            // Clear the sustain pedal so the outgoing chord stops ringing.
            // Only here — not in playPad, which also fires on resume and on
            // ambient-octave drags, where re-pedalling would be spurious.
            midiLayer.repedal();

            // Trigger Ambient Pad with the chord
            const padNotes = Config.getChordNotes(
              parsed.rootMidi,
              parsed.chordTypeKey,
            );
            playPad(padNotes, (preset.ambientOctave ?? 0) * 12);

            // Update UI (Show chord symbol)
            infoPreset.textContent = `${preset.name} (${parsed.displayName})`;

            // Spike chord change glow for visual effect
            if (chordChangeEffect) {
              chordChangeGlow = 1.0;
            }
          }
        }

        // Decay chord change glow
        if (chordChangeGlow > 0.001) {
          chordChangeGlow *= 0.96;
          if (chordChangeGlow < 0.001) chordChangeGlow = 0;
        }

        // Update audio
        audioLayer.update(engine.voices);

        // Mirror triggers to the MIDI output
        midiLayer.update(engine.voices);

        // Draw scene
        if (renderer) {
          const preset = Config.PRESETS[currentPresetKey];
          const options = {
            easing: preset ? preset.easing || 'sine' : 'sine',
            elapsedBeats: engine.elapsedBeats,
            connectNeighbors: preset ? preset.connectNeighbors !== false : true,
            chordChangeGlow: chordChangeGlow,
            orbitPath: preset ? preset.orbitPath || 'circle' : 'circle',
            vis: visualSettings,
          };
          renderer.draw(p, engine.voices, p.width, p.height, options);
        }

        // Update elapsed time display
        infoElapsed.textContent = engine.getElapsedFormatted();

        // ── Debug Info (Canvas Overlay) ──
        if (p.frameCount % 10 === 0) {
          const preset = Config.PRESETS[currentPresetKey];
          const chordName =
            preset?.chordProgression?.[currentChordIndex] || 'N/A';
          const fps = p.frameRate().toFixed(0);

          // Build compact note list (show note names + delay for all voices)
          const noteNames = engine.voices.map((v) => {
            let name = v.note?.name || '?';
            if (v.startDelay > 0) name += `+${v.startDelay.toFixed(1)}s`;
            return name;
          });
          // Group into rows of 8 for readability
          const noteRows = [];
          for (let ni = 0; ni < noteNames.length; ni += 8) {
            noteRows.push(noteNames.slice(ni, ni + 8).join(' '));
          }

          // Find currently triggered voices
          const triggered = engine.voices
            .filter((v) => v.triggered)
            .map((v) => `${v.id}:${v.note?.name || '?'}`)
            .join(' ');

          p.debugInfoStr = `FPS:     ${fps}
Time:    ${engine.getElapsedFormatted()}
Beats:   ${engine.elapsedBeats.toFixed(1)}
BPM:     ${engine.bpm}
Preset:  ${currentPresetKey}
Scene:   ${currentSceneKey}
Voices:  ${engine.voices.length}
Chord:   ${currentChordIndex + 1}/${preset?.chordProgression?.length || 1} (${chordName})
Vol:     ${audioLayer ? parseInt(Tone.Destination.volume.value) : '?'} dB
Notes:   ${noteRows[0] || ''}${noteRows
            .slice(1)
            .map((r) => '\n         ' + r)
            .join('')}
Hit:     ${triggered || '-'}`;
        }
        if (p.debugInfoStr) {
          p.push();
          p.resetMatrix();

          // Calculate dynamic height based on content lines
          const lines = p.debugInfoStr.split('\n').length;
          const boxH = 24 + lines * 13;

          p.fill(0, 0, 0, 80); // Semi-transparent bg
          p.noStroke();
          p.rect(10, 10, 280, boxH, 4);

          p.fill(0, 0, 100);
          p.noStroke();
          p.textSize(11);
          p.textFont('monospace');
          p.textAlign(p.LEFT, p.TOP);
          p.text(p.debugInfoStr, 20, 20);
          p.pop();
        }

        // Update Progress Bar
        const progBar = document.getElementById('resolution-progress-fill');
        if (progBar && currentResolutionBeats > 0) {
          // cycle progress = (elapsed % total) / total
          const progress =
            (engine.elapsedBeats % currentResolutionBeats) /
            currentResolutionBeats;
          progBar.style.width = `${progress * 100}%`;
        }
      };

      p.windowResized = () => {
        p.resizeCanvas(p.windowWidth, p.windowHeight);
        if (renderer) renderer.onResize(p.width, p.height);
        if (renderer.currentScene && renderer.currentScene.setup) {
          renderer.currentScene.setup(engine.voices, p.width, p.height);
        }
      };

      // Store p5 reference for scene switching
      renderer.p = p;
    };

    new p5(sketch);

    // Start engine
    engine.start();

    // Show controls, info
    startOverlay.classList.add('fade-out');
    setTimeout(() => {
      controlsEl.classList.remove('hidden');
      infoDisplay.classList.remove('hidden');
    }, 800);
  });

  // ── Controls toggle ──
  controlsToggle.addEventListener('click', () => {
    controlsPanel.classList.toggle('open');
  });

  // Close controls when clicking outside
  document.addEventListener('click', (e) => {
    if (
      !controlsEl.contains(e.target) &&
      controlsPanel.classList.contains('open')
    ) {
      controlsPanel.classList.remove('open');
    }
  });

  // ── Preset change ──
  /**
   * Swap the engine, audio and visuals over to a preset.  Shared by the
   * dropdown and by loading a saved preset from the Presets sidebar.
   * @param {string} key - key into Config.PRESETS
   */
  async function applyPresetKey(key) {
    if (!Config.PRESETS[key]) return;
    buildFromPreset(key);

    // A saved preset also carries the visuals and scene it was saved with
    const stored = UserPresets.isUserKey(key)
      ? UserPresets.get(UserPresets.idFromKey(key))
      : null;
    if (stored?.vis) applyVisualSettings(stored.vis);
    if (stored?.scene) {
      currentSceneKey = stored.scene;
      sceneSelect.value = stored.scene;
    }

    // Reset speed multiplier
    if (typeof baselineBpm !== 'undefined') {
      baselineBpm = null;
      const speedEl = document.getElementById('mix-speed');
      const speedValEl = document.getElementById('mix-speed-val');
      if (speedEl) {
        speedEl.value = 1;
      }
      if (speedValEl) {
        speedValEl.textContent = '1.0';
      }
    }

    if (audioLayer) {
      await audioLayer.reinit(engine.voices);
    }

    // New voice set — release anything the old one left sounding externally
    midiLayer.allNotesOff();

    // Dispose old ambient layer and create a fresh one
    if (ambientLayer) {
      ambientLayer.dispose();
      ambientLayer = null;
    }
    ambientLayer = new AmbientLayer();
    applyVolume();

    // Trigger initial ambient chord for new preset
    const preset = Config.PRESETS[key];
    if (preset?.chordProgression?.length > 0) {
      const parsed = Config.parseChordSymbol(preset.chordProgression[0]);
      const padNotes = Config.getChordNotes(
        parsed.rootMidi,
        parsed.chordTypeKey,
      );
      playPad(padNotes, (preset.ambientOctave ?? 0) * 12);

      // Re-tune voices
      retuneVoices(parsed, preset, engine.voices.length);
    }

    if (renderer && renderer.p) {
      renderer.setScene(
        currentSceneKey,
        engine.voices,
        renderer.p.width,
        renderer.p.height,
      );
    }

    // Restart engine
    engine.start();
    pauseBtn.textContent = 'Pause';
  }

  presetSelect.addEventListener('change', (e) =>
    applyPresetKey(e.target.value),
  );

  // ── Scene change ──
  sceneSelect.addEventListener('change', (e) => {
    currentSceneKey = e.target.value;
    if (renderer && renderer.p) {
      renderer.setScene(
        currentSceneKey,
        engine.voices,
        renderer.p.width,
        renderer.p.height,
      );
    }
  });

  // ── BPM slider ──
  bpmSlider.addEventListener('input', (e) => {
    const bpm = parseFloat(e.target.value);
    // if nan, do not set
    if (isNaN(bpm)) return;
    // if bpm is out of range, do not set
    if (bpm < 0.01 || bpm > 250) return;
    bpmValue.textContent = bpm;
    if (engine) engine.setBpm(bpm);
    if (bpmNumber) bpmNumber.value = bpm;
  });
  bpmNumber.addEventListener('input', (e) => {
    const bpm = parseFloat(e.target.value);
    // if nan, do not set
    if (isNaN(bpm)) return;
    // if bpm is out of range, do not set
    if (bpm < 0.01 || bpm > 250) return;
    bpmValue.textContent = bpm;
    if (engine) engine.setBpm(bpm);
    if (bpmSlider) bpmSlider.value = bpm;
  });

  // ── Volume slider ──
  volumeSlider.addEventListener('input', (e) => {
    const vol = parseFloat(e.target.value);
    volumeValue.textContent = vol;
    applyVolume();
  });

  // ── Pause / Resume ──
  pauseBtn.addEventListener('click', () => {
    if (!engine) return;
    engine.toggle();
    pauseBtn.textContent = engine.isRunning ? 'Pause' : 'Resume';

    // Don't leave external gear droning while paused
    if (!engine.isRunning) midiLayer.allNotesOff();

    // Manage ambient
    if (ambientLayer) {
      if (!engine.isRunning) ambientLayer.stop();
      else {
        // Trigger currently active chord on resume
        const preset = Config.PRESETS[currentPresetKey];
        if (preset?.chordProgression?.length > 0) {
          const chordSymbol = preset.chordProgression[currentChordIndex];
          const parsed = Config.parseChordSymbol(chordSymbol);
          const padNotes = Config.getChordNotes(
            parsed.rootMidi,
            parsed.chordTypeKey,
          );
          playPad(padNotes, (preset.ambientOctave ?? 0) * 12);
        }
      }
    }
  });

  // ── Advanced Controls ──
  const advancedBtn = document.getElementById('advanced-btn');
  const sidebar = document.getElementById('advanced-sidebar');
  const closeAdvanced = document.getElementById('close-advanced');
  const applyCustomBtn = document.getElementById('apply-custom-btn');
  const advScale = document.getElementById('adv-scale');

  // Populate Scale Dropdown
  Object.keys(Config.SCALES).forEach((key) => {
    const opt = document.createElement('option');
    opt.value = key;
    opt.textContent = Config.SCALES[key].name;
    advScale.appendChild(opt);
  });

  // Populate Phase Pattern Dropdown
  const advOffsetPattern = document.getElementById('adv-offset-pattern');
  Object.entries(Config.PHASE_PATTERNS).forEach(([key, pattern]) => {
    const opt = document.createElement('option');
    opt.value = key;
    opt.textContent = pattern.name;
    if (key === 'none') opt.selected = true;
    advOffsetPattern.appendChild(opt);
  });

  // Populate Spatial Pattern Dropdown
  const advSpatialPattern = document.getElementById('adv-spatial-pattern');
  Object.entries(Config.SPATIAL_PATTERNS).forEach(([key, pattern]) => {
    const opt = document.createElement('option');
    opt.value = key;
    opt.textContent = pattern.name;
    if (key === 'none') opt.selected = true;
    advSpatialPattern.appendChild(opt);
  });

  // Populate Orbit Path Dropdown
  const advOrbitPath = document.getElementById('adv-orbit-path');
  Object.entries(Config.ORBIT_SHAPES).forEach(([key, shape]) => {
    const opt = document.createElement('option');
    opt.value = key;
    opt.textContent = shape.name;
    if (key === 'circle') opt.selected = true;
    advOrbitPath.appendChild(opt);
  });

  // Chord-tones-only checkbox toggles scale dropdown and updates preset
  const advChordTonesOnly = document.getElementById('adv-chord-tones-only');
  advChordTonesOnly.addEventListener('change', () => {
    advScale.disabled = advChordTonesOnly.checked;
    advScale.style.opacity = advChordTonesOnly.checked ? '0.4' : '1';

    // Update the current preset so retuneVoices picks it up
    const preset = Config.PRESETS[currentPresetKey];
    if (preset) {
      preset.chordTonesOnly = advChordTonesOnly.checked;

      // Immediately retune voices using the current chord
      if (
        preset.chordProgression &&
        preset.chordProgression.length > 0 &&
        engine
      ) {
        const chordSymbol = preset.chordProgression[currentChordIndex];
        const parsed = Config.parseChordSymbol(chordSymbol);
        retuneVoices(parsed, preset, engine.voices.length);
      }
    }
  });

  // Orbit path dropdown updates the preset live
  advOrbitPath.addEventListener('change', () => {
    const preset = Config.PRESETS[currentPresetKey];
    if (preset) preset.orbitPath = advOrbitPath.value;
  });

  // ── Visual Settings (live-updating) ──
  // Declared as tables so the same list drives both the live wiring and the
  // restore path used when a saved preset brings its own visuals along.
  const VISUAL_SLIDERS = [
    { id: 'adv-note-size', valId: 'adv-note-size-val', key: 'noteSize' },
    {
      id: 'adv-glow-intensity',
      valId: 'adv-glow-intensity-val',
      key: 'glowIntensity',
    },
    {
      id: 'adv-flash-intensity',
      valId: 'adv-flash-intensity-val',
      key: 'flashIntensity',
    },
    {
      id: 'adv-trail-length',
      valId: 'adv-trail-length-val',
      key: 'trailLength',
    },
    {
      id: 'adv-trail-opacity',
      valId: 'adv-trail-opacity-val',
      key: 'trailOpacity',
    },
    {
      id: 'adv-line-opacity',
      valId: 'adv-line-opacity-val',
      key: 'lineOpacity',
    },
    {
      id: 'adv-line-thickness',
      valId: 'adv-line-thickness-val',
      key: 'lineThickness',
    },
    {
      id: 'adv-path-opacity',
      valId: 'adv-path-opacity-val',
      key: 'pathOpacity',
    },
    { id: 'adv-color-sat', valId: 'adv-color-sat-val', key: 'colorSaturation' },
    { id: 'adv-color-bri', valId: 'adv-color-bri-val', key: 'colorBrightness' },
    { id: 'adv-bg-opacity', valId: 'adv-bg-opacity-val', key: 'bgOpacity' },
  ];
  const VISUAL_CHECKBOXES = [
    { id: 'adv-monochrome', key: 'monochrome' },
    { id: 'adv-show-paths', key: 'showPaths' },
    { id: 'adv-show-trails', key: 'showTrails' },
    { id: 'adv-show-triggers', key: 'showTriggers' },
    { id: 'adv-show-stars', key: 'showStars' },
  ];
  const VISUAL_SELECTS = [
    { id: 'adv-note-style', key: 'noteStyle' },
    { id: 'adv-scene-theme', key: 'sceneTheme' },
  ];

  const visualSettings = {
    noteStyle: 'glow',
    noteSize: 1.0,
    glowIntensity: 1.0,
    flashIntensity: 1.0,
    trailLength: 1.0,
    trailOpacity: 1.0,
    lineOpacity: 1.0,
    lineThickness: 1.0,
    pathOpacity: 1.0,
    colorSaturation: 1.0,
    colorBrightness: 1.0,
    bgOpacity: 1.0,
    monochrome: false,
    showPaths: true,
    showTrails: true,
    showTriggers: true,
    showStars: true,
    sceneTheme: 'default',
  };

  const VISUAL_SLIDER_DIVISOR = 100;

  VISUAL_SLIDERS.forEach(({ id, valId, key }) => {
    const slider = document.getElementById(id);
    const valSpan = document.getElementById(valId);
    if (!slider) return;
    slider.addEventListener('input', () => {
      const v = parseFloat(slider.value);
      visualSettings[key] = v / VISUAL_SLIDER_DIVISOR;
      if (valSpan) valSpan.textContent = Math.round(v);
    });
  });

  VISUAL_CHECKBOXES.forEach(({ id, key }) => {
    const cb = document.getElementById(id);
    if (!cb) return;
    cb.addEventListener('change', () => {
      visualSettings[key] = cb.checked;
    });
  });

  VISUAL_SELECTS.forEach(({ id, key }) => {
    const sel = document.getElementById(id);
    if (!sel) return;
    sel.addEventListener('change', () => {
      visualSettings[key] = sel.value;
    });
  });

  /**
   * Overwrite the live visual settings from a saved snapshot and push the
   * values back into the sidebar controls.  Unknown/missing keys are left at
   * whatever they currently are, so older saves stay loadable.
   * @param {object} vis
   */
  function applyVisualSettings(vis) {
    if (!vis) return;

    VISUAL_SLIDERS.forEach(({ id, valId, key }) => {
      if (typeof vis[key] !== 'number' || Number.isNaN(vis[key])) return;
      visualSettings[key] = vis[key];
      const slider = document.getElementById(id);
      const valSpan = document.getElementById(valId);
      const shown = vis[key] * VISUAL_SLIDER_DIVISOR;
      if (slider) slider.value = shown;
      if (valSpan) valSpan.textContent = Math.round(shown);
    });

    VISUAL_CHECKBOXES.forEach(({ id, key }) => {
      if (typeof vis[key] !== 'boolean') return;
      visualSettings[key] = vis[key];
      const cb = document.getElementById(id);
      if (cb) cb.checked = vis[key];
    });

    VISUAL_SELECTS.forEach(({ id, key }) => {
      if (typeof vis[key] !== 'string') return;
      const sel = document.getElementById(id);
      // Ignore values from a build that had options we no longer offer
      if (sel && !Array.from(sel.options).some((o) => o.value === vis[key])) {
        return;
      }
      visualSettings[key] = vis[key];
      if (sel) sel.value = vis[key];
    });
  }

  // Connect-neighbors checkbox updates the preset live
  const advConnectNeighbors = document.getElementById('adv-connect-neighbors');
  advConnectNeighbors.addEventListener('change', () => {
    const preset = Config.PRESETS[currentPresetKey];
    if (preset) preset.connectNeighbors = advConnectNeighbors.checked;
  });

  // Chord change effect checkbox
  const advChordChangeEffect = document.getElementById(
    'adv-chord-change-effect',
  );
  advChordChangeEffect.addEventListener('change', () => {
    chordChangeEffect = advChordChangeEffect.checked;
    if (!chordChangeEffect) chordChangeGlow = 0;
  });

  advancedBtn.addEventListener('click', () => {
    sidebar.classList.add('open');
    presetsSidebar.classList.remove('open');
    controlsPanel.classList.remove('open');
  });

  closeAdvanced.addEventListener('click', () => {
    sidebar.classList.remove('open');
  });

  // ── Presets Sidebar ──
  const presetsBtn = document.getElementById('presets-btn');
  const presetsSidebar = document.getElementById('presets-sidebar');
  const closePresets = document.getElementById('close-presets');
  const presetSaveName = document.getElementById('preset-save-name');
  const presetSaveDesc = document.getElementById('preset-save-desc');
  const presetSaveBtn = document.getElementById('preset-save-btn');
  const presetSaveStatus = document.getElementById('preset-save-status');
  const presetList = document.getElementById('preset-list');
  const presetEmpty = document.getElementById('preset-empty');
  const presetCount = document.getElementById('preset-count');
  const presetExportBtn = document.getElementById('preset-export-btn');
  const presetImportBtn = document.getElementById('preset-import-btn');
  const presetImportFile = document.getElementById('preset-import-file');

  let statusTimer = null;

  /** Flash a line of feedback under the save button. */
  function setPresetStatus(message, isError = false) {
    if (!presetSaveStatus) return;
    presetSaveStatus.textContent = message;
    presetSaveStatus.classList.toggle('error', isError);
    clearTimeout(statusTimer);
    if (message) {
      statusTimer = setTimeout(() => {
        presetSaveStatus.textContent = '';
        presetSaveStatus.classList.remove('error');
      }, 4000);
    }
  }

  /**
   * Capture everything currently playing as a plain preset object.
   * The live preset is the source of truth (the Advanced sidebar only takes
   * effect on "Generate & Apply", so its unapplied edits are deliberately
   * ignored here — what you hear is what you save).
   */
  function snapshotCurrentSetup() {
    const preset = Config.PRESETS[currentPresetKey] || {};
    const snapshot = {
      ...preset,
      bpm: engine ? engine.bpm : preset.bpm,
      vis: { ...visualSettings },
      scene: currentSceneKey,
    };

    // Without a manual definition the engine's own ratios are the exact truth,
    // including anything the generator produced.
    if (!preset.manualVoices && engine) {
      snapshot.ratios = engine.voices.map((v) => v.ratio);
    }
    return snapshot;
  }

  /** Load a saved preset by its stored id. */
  async function loadUserPreset(id) {
    const stored = UserPresets.get(id);
    if (!stored) return;
    UserPresets.mergeIntoConfig(Config.PRESETS);
    rebuildPresetDropdown();
    await applyPresetKey(UserPresets.configKey(id));
    renderPresetList();
  }

  /** Redraw the saved-preset list. */
  function renderPresetList() {
    if (!presetList) return;
    const saved = UserPresets.list();
    presetList.innerHTML = '';

    if (presetCount) {
      presetCount.textContent = saved.length ? `(${saved.length})` : '';
    }
    if (presetEmpty) {
      presetEmpty.hidden = saved.length > 0;
      if (!UserPresets.available) {
        presetEmpty.hidden = false;
        presetEmpty.textContent =
          'This browser is blocking local storage, so presets cannot be saved here.';
      }
    }

    saved.forEach((p) => {
      const key = UserPresets.configKey(p.id);
      const item = document.createElement('li');
      item.className = 'preset-item';
      if (key === currentPresetKey) item.classList.add('active');

      const name = document.createElement('div');
      name.className = 'preset-item-name';
      name.textContent = p.name;
      item.appendChild(name);

      if (p.description) {
        const desc = document.createElement('p');
        desc.className = 'preset-item-desc';
        desc.textContent = p.description;
        item.appendChild(desc);
      }

      const voiceCount = p.manualVoices
        ? (Config.parseManualVoices(p.manualVoices) || []).length
        : (p.ratios || []).length;
      const meta = document.createElement('div');
      meta.className = 'preset-item-meta';
      meta.textContent = [
        `${voiceCount} voices`,
        `${p.bpm} BPM`,
        p.scene || currentSceneKey,
      ].join(' · ');
      item.appendChild(meta);

      const actions = document.createElement('div');
      actions.className = 'preset-item-actions';

      const loadBtn = document.createElement('button');
      loadBtn.textContent = 'Load';
      loadBtn.addEventListener('click', () => loadUserPreset(p.id));
      actions.appendChild(loadBtn);

      const renameBtn = document.createElement('button');
      renameBtn.textContent = 'Rename';
      renameBtn.addEventListener('click', () => {
        const next = window.prompt('New name for this preset:', p.name);
        if (next === null) return;
        if (!next.trim()) {
          setPresetStatus('A preset needs a name.', true);
          return;
        }
        UserPresets.rename(p.id, next);
        UserPresets.mergeIntoConfig(Config.PRESETS);
        rebuildPresetDropdown();
        updatePresetDescription();
        if (key === currentPresetKey) updateInfoPreset();
        renderPresetList();
      });
      actions.appendChild(renameBtn);

      const overwriteBtn = document.createElement('button');
      overwriteBtn.textContent = 'Update';
      overwriteBtn.title = 'Replace this preset with what is playing now';
      overwriteBtn.addEventListener('click', () => {
        if (!window.confirm(`Replace "${p.name}" with the current setup?`)) {
          return;
        }
        const snapshot = snapshotCurrentSetup();
        snapshot.name = p.name;
        snapshot.description = p.description;
        UserPresets.save(snapshot, p.id);
        UserPresets.mergeIntoConfig(Config.PRESETS);
        rebuildPresetDropdown();
        renderPresetList();
        setPresetStatus(`Updated "${p.name}".`);
      });
      actions.appendChild(overwriteBtn);

      const deleteBtn = document.createElement('button');
      deleteBtn.className = 'danger';
      deleteBtn.textContent = 'Delete';
      deleteBtn.addEventListener('click', () => {
        if (!window.confirm(`Delete "${p.name}"? This cannot be undone.`)) {
          return;
        }
        const wasActive = key === currentPresetKey;
        UserPresets.remove(p.id);
        UserPresets.mergeIntoConfig(Config.PRESETS);
        // A deleted preset that is still playing keeps playing, but the
        // dropdown has to fall back to something that still exists.
        if (wasActive) currentPresetKey = firstPresetKey;
        rebuildPresetDropdown();
        updatePresetDescription();
        renderPresetList();
        setPresetStatus(`Deleted "${p.name}".`);
      });
      actions.appendChild(deleteBtn);

      item.appendChild(actions);
      presetList.appendChild(item);
    });
  }

  presetsBtn.addEventListener('click', () => {
    presetsSidebar.classList.add('open');
    sidebar.classList.remove('open');
    controlsPanel.classList.remove('open');
    renderPresetList();
    if (!presetSaveName.value) {
      const active = Config.PRESETS[currentPresetKey];
      presetSaveName.placeholder = active
        ? `e.g. ${active.name} (my version)`
        : 'e.g. Midnight Drift';
    }
  });

  closePresets.addEventListener('click', () => {
    presetsSidebar.classList.remove('open');
  });

  presetSaveBtn.addEventListener('click', () => {
    if (!engine) {
      setPresetStatus('Start the engine first.', true);
      return;
    }
    const name = presetSaveName.value.trim();
    if (!name) {
      setPresetStatus('Give the preset a name.', true);
      presetSaveName.focus();
      return;
    }
    if (!UserPresets.available) {
      setPresetStatus(
        'This browser is blocking local storage, so the preset cannot be saved.',
        true,
      );
      return;
    }

    const clash = UserPresets.findByName(name);
    if (clash && !window.confirm(`"${name}" already exists. Replace it?`)) {
      return;
    }

    const snapshot = snapshotCurrentSetup();
    snapshot.name = name;
    snapshot.description = presetSaveDesc.value.trim();

    const record = UserPresets.save(snapshot, clash ? clash.id : null);
    UserPresets.mergeIntoConfig(Config.PRESETS);

    // Follow the save: the new preset becomes the selected one
    currentPresetKey = UserPresets.configKey(record.id);
    rebuildPresetDropdown();
    updatePresetDescription();
    updateInfoPreset();
    renderPresetList();

    presetSaveName.value = '';
    presetSaveDesc.value = '';
    setPresetStatus(`Saved "${record.name}".`);
  });

  presetSaveName.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') presetSaveBtn.click();
  });
  presetSaveDesc.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') presetSaveBtn.click();
  });

  presetExportBtn.addEventListener('click', () => {
    if (UserPresets.list().length === 0) {
      setPresetStatus('There is nothing to export yet.', true);
      return;
    }
    const blob = new Blob([UserPresets.exportJSON()], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    const stamp = new Date().toISOString().slice(0, 10);
    link.href = url;
    link.download = `polyrhythm-presets-${stamp}.json`;
    link.click();
    URL.revokeObjectURL(url);
    setPresetStatus('Exported.');
  });

  presetImportBtn.addEventListener('click', () => presetImportFile.click());

  presetImportFile.addEventListener('change', async () => {
    const file = presetImportFile.files && presetImportFile.files[0];
    if (!file) return;
    try {
      const text = await file.text();
      const { added, error } = UserPresets.importJSON(text);
      if (error) {
        setPresetStatus(error, true);
      } else {
        UserPresets.mergeIntoConfig(Config.PRESETS);
        rebuildPresetDropdown();
        renderPresetList();
        setPresetStatus(`Imported ${added} preset${added === 1 ? '' : 's'}.`);
      }
    } catch (err) {
      setPresetStatus('Could not read that file.', true);
    }
    // Allow re-picking the same file
    presetImportFile.value = '';
  });

  renderPresetList();

  // Ambient Octave slider
  const advAmbientOctave = document.getElementById('adv-ambient-octave');
  const advAmbientOctaveVal = document.getElementById('adv-ambient-octave-val');
  advAmbientOctave.addEventListener('input', () => {
    const oct = parseInt(advAmbientOctave.value);
    advAmbientOctaveVal.textContent = oct > 0 ? `+${oct}` : oct;

    // Update current preset
    const preset = Config.PRESETS[currentPresetKey];
    if (preset) preset.ambientOctave = oct;

    // Re-trigger current chord at new octave
    if (ambientLayer && preset?.chordProgression?.length > 0) {
      const chordSymbol = preset.chordProgression[currentChordIndex];
      const parsed = Config.parseChordSymbol(chordSymbol);
      const padNotes = Config.getChordNotes(
        parsed.rootMidi,
        parsed.chordTypeKey,
      );
      playPad(padNotes, oct * 12);
    }
  });

  // Voice Count label update
  const advVoiceCountSlider = document.getElementById('adv-voice-count');
  const advVoiceCountVal = document.getElementById('adv-voice-count-val');
  if (advVoiceCountSlider && advVoiceCountVal) {
    advVoiceCountSlider.addEventListener('input', () => {
      advVoiceCountVal.textContent = advVoiceCountSlider.value;
    });
  }

  // Copy generator (voice count + ratio range) → manual voices textarea
  const copyGeneratorBtn = document.getElementById('adv-copy-generator');
  if (copyGeneratorBtn) {
    copyGeneratorBtn.addEventListener('click', () => {
      const count = parseInt(
        document.getElementById('adv-voice-count').value,
        10,
      );
      const rStart = parseFloat(
        document.getElementById('adv-ratio-start').value,
      );
      const rEnd = parseFloat(document.getElementById('adv-ratio-end').value);
      if (Number.isNaN(count) || Number.isNaN(rStart) || Number.isNaN(rEnd)) {
        return;
      }
      const ratios = Config.createSmoothRatios(count, rStart, rEnd);
      const manualVoices = document.getElementById('adv-manual-voices');
      manualVoices.value = ratios
        .map((r) => parseFloat(r.toFixed(4)).toString())
        .join(', ');
      manualVoices.dispatchEvent(new Event('input', { bubbles: true }));
    });
  }

  // Chord Ratio slider ↔ number input sync
  const advChordRatioSlider = document.getElementById('adv-chord-ratio');
  const advChordRatioNumber = document.getElementById('adv-chord-ratio-number');
  const advChordRatioVal = document.getElementById('adv-chord-ratio-val');
  const applyChordRatio = (value) => {
    const ratio = parseFloat(value);
    if (Number.isNaN(ratio)) return;
    if (advChordRatioSlider) advChordRatioSlider.value = ratio;
    if (advChordRatioNumber) advChordRatioNumber.value = ratio;
    if (advChordRatioVal) advChordRatioVal.textContent = ratio;
    if (engine) engine.chordRatio = ratio;
    const preset = Config.PRESETS[currentPresetKey];
    if (preset) preset.chordRatio = ratio;
  };
  if (advChordRatioSlider) {
    advChordRatioSlider.addEventListener('input', () =>
      applyChordRatio(advChordRatioSlider.value),
    );
  }
  if (advChordRatioNumber) {
    advChordRatioNumber.addEventListener('input', () =>
      applyChordRatio(advChordRatioNumber.value),
    );
  }

  // ── Mixer Drawer ──
  const mixerBtn = document.getElementById('mixer-btn');
  const mixerDrawer = document.getElementById('mixer-drawer');
  const closeMixer = document.getElementById('close-mixer');

  mixerBtn.addEventListener('click', () => {
    mixerDrawer.classList.toggle('open');
  });
  closeMixer.addEventListener('click', () => {
    mixerDrawer.classList.remove('open');
  });

  // Reverb Mix
  const mixReverb = document.getElementById('mix-reverb');
  const mixReverbVal = document.getElementById('mix-reverb-val');
  mixReverb.addEventListener('input', () => {
    const val = parseInt(mixReverb.value);
    mixReverbVal.textContent = val;
    if (audioLayer) audioLayer.setReverbMix(val);
    if (ambientLayer) ambientLayer.setReverbMix(val);
  });

  // Reverb Size (feedback)
  const mixReverbSize = document.getElementById('mix-reverb-size');
  const mixReverbSizeVal = document.getElementById('mix-reverb-size-val');
  mixReverbSize.addEventListener('input', () => {
    const val = parseInt(mixReverbSize.value);
    mixReverbSizeVal.textContent = val;
    if (audioLayer) audioLayer.setFeedback(val);
    if (ambientLayer) ambientLayer.setFeedback(val);
  });

  // Delay Time
  const mixDelay = document.getElementById('mix-delay');
  const mixDelayVal = document.getElementById('mix-delay-val');
  mixDelay.addEventListener('input', () => {
    const ms = parseInt(mixDelay.value);
    mixDelayVal.textContent = ms;
    const sec = ms / 1000;
    if (audioLayer) audioLayer.setDelayTime(sec);
    if (ambientLayer) ambientLayer.setDelayTime(sec);
  });

  // Speed Multiplier
  const mixSpeed = document.getElementById('mix-speed');
  const mixSpeedVal = document.getElementById('mix-speed-val');
  let baselineBpm = null; // stored when speed is first adjusted
  mixSpeed.addEventListener('input', () => {
    const mult = parseFloat(mixSpeed.value);
    mixSpeedVal.textContent = mult.toFixed(1);
    if (!engine) return;
    if (baselineBpm === null) baselineBpm = engine.bpm;
    const newBpm = baselineBpm * mult;
    engine.setBpm(newBpm);
    // Update BPM display (don't change slider — speed is separate)
    bpmValue.textContent = newBpm.toFixed(1);
  });

  // Sound Type
  const mixSoundType = document.getElementById('mix-sound-type');
  mixSoundType.addEventListener('change', () => {
    if (audioLayer) audioLayer.setSoundType(mixSoundType.value);
  });

  // Filter
  const mixFilter = document.getElementById('mix-filter');
  const mixFilterVal = document.getElementById('mix-filter-val');
  mixFilter.addEventListener('input', () => {
    const freq = parseInt(mixFilter.value);
    mixFilterVal.textContent = freq;
    if (audioLayer) audioLayer.setFilterFreq(freq);
    if (ambientLayer) ambientLayer.setFilterFreq(freq);
  });

  // ── MIDI Output ──
  const midiEnabled = document.getElementById('midi-enabled');
  const midiDevice = document.getElementById('midi-device');
  const midiStatus = document.getElementById('midi-status');
  const midiChannelMode = document.getElementById('midi-channel-mode');
  const midiChannel = document.getElementById('midi-channel');
  const midiVelocity = document.getElementById('midi-velocity');
  const midiVelocityVal = document.getElementById('midi-velocity-val');
  const midiGate = document.getElementById('midi-gate');
  const midiGateVal = document.getElementById('midi-gate-val');
  const midiTranspose = document.getElementById('midi-transpose');
  const midiTransposeVal = document.getElementById('midi-transpose-val');
  const midiPad = document.getElementById('midi-pad');
  const midiPadChannel = document.getElementById('midi-pad-channel');
  const midiMuteInternal = document.getElementById('midi-mute-internal');
  const midiSustain = document.getElementById('midi-sustain');
  const midiRepedal = document.getElementById('midi-repedal');
  const midiRepedalWrap = document.getElementById('midi-repedal-wrap');

  /**
   * True when voice notes land on the pad's channel.  Sharing a channel makes
   * the pad unreleasable under a held pedal, so it is worth calling out.
   */
  function padChannelCollides() {
    if (!midiLayer.sendPad || !engine) return false;
    if (midiLayer.channelMode !== 'spread') {
      return midiLayer.channel === midiLayer.padChannel;
    }
    for (let i = 0; i < engine.voices.length; i++) {
      if (((midiLayer.channel - 1 + i) % 16) + 1 === midiLayer.padChannel) {
        return true;
      }
    }
    return false;
  }

  /** Describe what the MIDI layer is currently doing. */
  function updateMidiStatus() {
    if (!midiLayer.supported) {
      midiStatus.textContent = 'Web MIDI is not supported in this browser.';
      return;
    }
    if (!midiLayer.initialized) {
      midiStatus.textContent = 'Enable to scan for outputs.';
      return;
    }
    const name = midiLayer.getOutputName();
    if (!midiLayer.enabled) {
      midiStatus.textContent = 'MIDI output off.';
    } else if (!name) {
      midiStatus.textContent = 'Select an output device.';
    } else {
      midiStatus.textContent = `Sending to ${name}.`;
    }

    const clash = padChannelCollides();
    if (clash) {
      midiStatus.textContent += ` Voice notes also land on pad channel ${midiLayer.padChannel} — give the pad a channel of its own.`;
    }
    midiStatus.classList.toggle('warn', clash);
  }

  /**
   * Rebuild the device dropdown, keeping the current selection if that port
   * is still connected.
   * @param {Array<{id: string, name: string}>} [outputs]
   */
  function refreshMidiDevices(outputs) {
    const ports = outputs || midiLayer.getOutputs();
    const previous = midiDevice.value;

    midiDevice.innerHTML = '';
    const none = document.createElement('option');
    none.value = '';
    none.textContent = ports.length ? '— none —' : '— no outputs found —';
    midiDevice.appendChild(none);

    ports.forEach((port) => {
      const opt = document.createElement('option');
      opt.value = port.id;
      opt.textContent = port.name;
      midiDevice.appendChild(opt);
    });

    const stillConnected = ports.some((p) => p.id === previous);
    midiDevice.value = stillConnected ? previous : '';
    midiLayer.setOutput(midiDevice.value || null);
    updateMidiStatus();
  }

  /** Send the chord that is currently sounding to the MIDI pad channel. */
  function sendCurrentChordToMidi() {
    const preset = Config.PRESETS[currentPresetKey];
    if (!preset?.chordProgression?.length) return;
    const parsed = Config.parseChordSymbol(
      preset.chordProgression[currentChordIndex],
    );
    const padNotes = Config.getChordNotes(parsed.rootMidi, parsed.chordTypeKey);
    midiLayer.sendChord(padNotes, (preset.ambientOctave ?? 0) * 12);
  }

  midiLayer.onPortsChanged = (outputs) => refreshMidiDevices(outputs);

  if (!midiLayer.supported) {
    midiEnabled.disabled = true;
    midiDevice.disabled = true;
  }
  midiRepedalWrap.classList.toggle('disabled', !midiSustain.checked);
  updateMidiStatus();

  midiEnabled.addEventListener('change', async () => {
    if (midiEnabled.checked) {
      midiStatus.textContent = 'Requesting MIDI access…';
      const granted = await midiLayer.init();
      if (!granted) {
        midiEnabled.checked = false;
        midiStatus.textContent = 'MIDI access was denied or unavailable.';
        return;
      }
      refreshMidiDevices();

      // With exactly one output, pick it so enabling is a single click
      const ports = midiLayer.getOutputs();
      if (!midiDevice.value && ports.length === 1) {
        midiDevice.value = ports[0].id;
        midiLayer.setOutput(ports[0].id);
      }
    }
    midiLayer.setEnabled(midiEnabled.checked);
    if (midiLayer.isSending && midiLayer.sendPad) sendCurrentChordToMidi();
    updateMidiStatus();
  });

  midiDevice.addEventListener('change', () => {
    midiLayer.setOutput(midiDevice.value || null);
    if (midiLayer.isSending && midiLayer.sendPad) sendCurrentChordToMidi();
    updateMidiStatus();
  });

  midiChannelMode.addEventListener('change', () => {
    midiLayer.setChannelMode(midiChannelMode.value);
    updateMidiStatus();
  });

  midiChannel.addEventListener('change', () => {
    midiLayer.setChannel(parseInt(midiChannel.value) || 1);
    midiChannel.value = midiLayer.channel;
    updateMidiStatus();
  });

  midiVelocity.addEventListener('input', () => {
    const val = parseInt(midiVelocity.value);
    midiVelocityVal.textContent = val;
    midiLayer.setVelocity(val);
  });

  midiGate.addEventListener('input', () => {
    const val = parseInt(midiGate.value);
    midiGateVal.textContent = val;
    midiLayer.setGate(val);
  });

  midiTranspose.addEventListener('input', () => {
    const val = parseInt(midiTranspose.value);
    midiTransposeVal.textContent = val > 0 ? `+${val}` : val;
    midiLayer.setTranspose(val);
  });

  midiPad.addEventListener('change', () => {
    midiLayer.setSendPad(midiPad.checked);
    // Start the pad on the chord already playing rather than the next one
    if (midiPad.checked) sendCurrentChordToMidi();
    updateMidiStatus();
  });

  midiPadChannel.addEventListener('change', () => {
    midiLayer.setPadChannel(parseInt(midiPadChannel.value) || 2);
    midiPadChannel.value = midiLayer.padChannel;
    if (midiLayer.sendPad) sendCurrentChordToMidi();
    updateMidiStatus();
  });

  midiSustain.addEventListener('change', () => {
    midiLayer.setSustain(midiSustain.checked);
    midiRepedalWrap.classList.toggle('disabled', !midiSustain.checked);
  });

  midiRepedal.addEventListener('change', () => {
    midiLayer.setRepedalOnChord(midiRepedal.checked);
  });

  midiMuteInternal.addEventListener('change', () => {
    internalSynthMuted = midiMuteInternal.checked;
    applyVolume();
  });

  // Leave no stuck notes on external gear when the page goes away
  window.addEventListener('pagehide', () => midiLayer.allNotesOff());
  window.addEventListener('beforeunload', () => midiLayer.allNotesOff());

  // Reset baseline BPM when preset changes or BPM slider moves
  bpmSlider.addEventListener('input', () => {
    baselineBpm = null;
    mixSpeed.value = 1;
    mixSpeedVal.textContent = '1.0';
  });

  // ── Resolution Calculation ──
  const resolutionDisplay = document.getElementById('resolution-display');
  function updateResolution() {
    const manualInput = document.getElementById('adv-manual-voices').value;
    const parsedManual = Config.parseManualVoices(manualInput);
    const bpm = parseFloat(bpmSlider.value) || 60;

    let ratios;
    if (parsedManual) {
      ratios = parsedManual.map((v) => v.ratio);
    } else {
      const count = parseInt(document.getElementById('adv-voice-count').value);
      const rStart = parseFloat(
        document.getElementById('adv-ratio-start').value,
      );
      const rEnd = parseFloat(document.getElementById('adv-ratio-end').value);
      if (isNaN(count)) return;
      ratios = Config.createSmoothRatios(count, rStart, rEnd);
    }

    const beats = Config.getPolyrhythmResolution(ratios);

    currentResolutionBeats = beats || 1;

    if (!beats) {
      resolutionDisplay.textContent = 'Resolution: N/A';
      return;
    }

    const seconds = beats * (60 / bpm);
    let timeStr = '';
    if (seconds > 31536000) timeStr = '> 1 year';
    else if (seconds > 86400) timeStr = `${(seconds / 86400).toFixed(1)} days`;
    else if (seconds > 3600) timeStr = `${(seconds / 3600).toFixed(1)}h`;
    else if (seconds > 60) timeStr = `${(seconds / 60).toFixed(1)}m`;
    else timeStr = `${seconds.toFixed(1)}s`;

    // Check if excessively large
    if (beats > 1e9)
      resolutionDisplay.textContent = 'Cycle: Effectively Infinite';
    else
      resolutionDisplay.textContent = `Resolves in ${beats.toLocaleString()} beats (${timeStr})`;
  }

  // Attach listeners for resolution update
  ['adv-voice-count', 'adv-ratio-start', 'adv-ratio-end'].forEach((id) => {
    document.getElementById(id).addEventListener('input', updateResolution);
  });
  document
    .getElementById('adv-manual-voices')
    .addEventListener('input', updateResolution);
  bpmSlider.addEventListener('input', updateResolution);
  bpmNumber.addEventListener('input', updateResolution);
  // Init
  updateResolution();

  // Apply Custom Config
  applyCustomBtn.addEventListener('click', async () => {
    const manualInput = document.getElementById('adv-manual-voices').value;
    const parsedManual = Config.parseManualVoices(manualInput);

    let ratios;
    let delays; // array of startDelay in seconds
    let sameNoteFlags;
    let manualNoteTags;

    if (parsedManual) {
      // Manual mode — use parsed ratios and delays
      const bpm = parseFloat(bpmSlider.value) || 60;
      ratios = parsedManual.map((v) => v.ratio);
      delays = parsedManual.map((v) => {
        if (v.delayUnit === 'b') {
          // Convert beats to seconds
          return (v.delaySec * 60) / bpm;
        }
        return v.delaySec;
      });
      sameNoteFlags = parsedManual.map((v) => !!v.sameAsPrevious);
      manualNoteTags = parsedManual.map((v) => v.noteTag || null);
    } else {
      // Generator mode
      const count = parseInt(document.getElementById('adv-voice-count').value);
      const rStart = parseFloat(
        document.getElementById('adv-ratio-start').value,
      );
      const rEnd = parseFloat(document.getElementById('adv-ratio-end').value);
      ratios = Config.createSmoothRatios(count, rStart, rEnd);
      delays = ratios.map(() => 0);
      sameNoteFlags = ratios.map(() => false);
      manualNoteTags = ratios.map(() => null);
    }

    const count = ratios.length;

    // Read Harmony
    const scaleKey = advScale.value;
    const easing = document.getElementById('adv-easing').value;
    const rootNote = document.getElementById('adv-root').value;
    const maxNote = document.getElementById('adv-max-note').value;

    // Read Progression
    const chordRatio = parseFloat(
      document.getElementById('adv-chord-ratio').value,
    );
    const rawProg = document.getElementById('adv-progression').value;
    const chordProgression = rawProg.split(/\s+/).filter((s) => s.length > 0);

    // Build Voice Config
    const rootMidi = Config.noteNameToMidi(rootNote);
    const maxMidi = maxNote ? Config.noteNameToMidi(maxNote) : null;
    const notes = Config.getNotesForScale(rootMidi, scaleKey, count, maxMidi);
    const colors = Config.generateColors(count);
    const phasePatternKey = advOffsetPattern.value || 'none';
    const phaseOffsets = Config.generatePhaseOffsets(count, phasePatternKey);
    const spatialPatternKey = advSpatialPattern.value || 'none';
    const spatialOffsets = Config.generateSpatialOffsets(
      count,
      spatialPatternKey,
    );

    const firstChordParsed =
      chordProgression.length > 0
        ? Config.parseChordSymbol(chordProgression[0])
        : null;

    const resolvedNotes = [];
    for (let i = 0; i < count; i++) {
      const prev = i > 0 ? resolvedNotes[i - 1] : null;
      const tagged = Config.resolveManualNoteTag(manualNoteTags[i], {
        prevNote: prev,
        chordRootMidi: firstChordParsed ? firstChordParsed.rootMidi : null,
        chordTypeKey: firstChordParsed ? firstChordParsed.chordTypeKey : null,
        maxMidi,
      });
      if (tagged) {
        resolvedNotes.push(tagged);
      } else if (sameNoteFlags[i] && i > 0) {
        resolvedNotes.push({ ...prev });
      } else {
        resolvedNotes.push(notes[i]);
      }
    }

    const voices = ratios.map((ratio, i) => {
      const note = resolvedNotes[i];
      return {
        ratio,
        note,
        color: colors[i],
        visualPhaseOffset: phaseOffsets[i],
        spatialOffset: spatialOffsets[i],
        startDelay: delays[i] || 0,
        sameNoteAsPrevious: sameNoteFlags[i] || false,
        manualNoteTag: manualNoteTags[i] || null,
      };
    });

    // Apply to Engine
    engine.chordRatio = chordRatio;
    engine.setVoices(voices);

    // Reset State
    currentPresetKey = 'custom';
    currentChordIndex = 0;

    // Inject custom preset
    Config.PRESETS['custom'] = {
      name: 'Custom Configuration',
      category: 'custom',
      description: 'Unsaved — save it from the Presets panel to keep it',
      ratios,
      manualVoices: manualInput.trim() || '',
      scale: scaleKey,
      rootNote,
      maxNote,
      chordRatio,
      chordProgression,
      chordTonesOnly: advChordTonesOnly.checked,
      connectNeighbors: advConnectNeighbors.checked,
      ambientOctave: parseInt(advAmbientOctave.value) || 0,
      visualPhasePattern: phasePatternKey,
      spatialPattern: spatialPatternKey,
      orbitPath: advOrbitPath.value || 'circle',
      easing,
      bpm: engine.bpm,
    };

    // Update UI
    rebuildPresetDropdown();
    updatePresetDescription();
    updateInfoPreset();
    renderPresetList();

    // Reinit Audio & Renderer
    await audioLayer.reinit(engine.voices);

    // New voice set — release anything the old one left sounding externally
    midiLayer.allNotesOff();

    if (renderer && renderer.p) {
      renderer.setScene(
        currentSceneKey,
        engine.voices,
        renderer.p.width,
        renderer.p.height,
      );
    }

    // Dispose old ambient layer and create a fresh one
    if (ambientLayer) {
      ambientLayer.dispose();
      ambientLayer = null;
    }
    ambientLayer = new AmbientLayer();
    applyVolume();

    // Trigger initial ambient chord and re-tune voices
    if (chordProgression.length > 0) {
      const parsed = Config.parseChordSymbol(chordProgression[0]);
      const padNotes = Config.getChordNotes(
        parsed.rootMidi,
        parsed.chordTypeKey,
      );
      playPad(padNotes, (parseInt(advAmbientOctave.value) || 0) * 12);

      // Re-tune voices
      retuneVoices(parsed, Config.PRESETS['custom'], engine.voices.length);
    }

    // Sidebar stays open for rapid iteration
    if (!engine.isRunning) engine.start();
  });
})();
