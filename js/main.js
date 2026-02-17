/**
 * main.js — Entry point. Wires TimingEngine, AudioLayer, and Renderer together.
 * Handles UI events and the p5.js sketch lifecycle.
 */

(function () {
  // ── State ──

  const firstPresetKey = Object.keys(Config.PRESETS)[0];
  let engine = null;
  let audioLayer = null;
  let renderer = null;
  let currentPresetKey = firstPresetKey;
  let currentSceneKey = 'circular-orbits';
  let currentChordIndex = 0;
  let ambientLayer;
  let currentResolutionBeats = 1;
  let started = false;

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

  // ── Populate preset dropdown ──
  Object.entries(Config.PRESETS).forEach(([key, preset]) => {
    const opt = document.createElement('option');
    opt.value = key;
    opt.textContent = preset.name;
    if (key === currentPresetKey) opt.selected = true;
    presetSelect.appendChild(opt);
  });

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
    if (cfg.preset.chordProgression && cfg.preset.chordProgression.length > 0) {
      const firstParsed = Config.parseChordSymbol(
        cfg.preset.chordProgression[0],
      );
      infoPreset.textContent = `${cfg.preset.name} (${firstParsed.displayName})`;
    } else {
      infoPreset.textContent = cfg.preset.name;
    }

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
    const chordRatioVal = document.getElementById('adv-chord-ratio-val');
    if (chordRatioSlider) {
      chordRatioSlider.value = cfg.preset.chordRatio ?? 1;
      if (chordRatioVal) chordRatioVal.textContent = cfg.preset.chordRatio ?? 1;
    }
    const progInput = document.getElementById('adv-progression');
    if (progInput) {
      progInput.value = (cfg.preset.chordProgression || []).join(' ');
    }

    // Sync Connect Neighbors
    const connectCheckbox = document.getElementById('adv-connect-neighbors');
    if (connectCheckbox) {
      connectCheckbox.checked = !!cfg.preset.connectNeighbors;
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
    audioLayer.setVolume(parseInt(volumeSlider.value));

    // Build ambient layer
    ambientLayer = new AmbientLayer();
    ambientLayer.setVolume(parseInt(volumeSlider.value));

    // Trigger initial chord if exists
    const preset = Config.PRESETS[currentPresetKey];
    if (preset?.chordProgression?.length > 0) {
      const parsed = Config.parseChordSymbol(preset.chordProgression[0]);
      const padNotes = Config.getChordNotes(
        parsed.rootMidi,
        parsed.chordTypeKey,
      );
      ambientLayer.playChord(padNotes, (preset.ambientOctave ?? 0) * 12);

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

            // Trigger Ambient Pad with the chord
            if (ambientLayer) {
              const padNotes = Config.getChordNotes(
                parsed.rootMidi,
                parsed.chordTypeKey,
              );
              ambientLayer.playChord(
                padNotes,
                (preset.ambientOctave ?? 0) * 12,
              );
            }

            // Update UI (Show chord symbol)
            infoPreset.textContent = `${preset.name} (${parsed.displayName})`;
          }
        }

        // Update audio
        audioLayer.update(engine.voices);

        // Draw scene
        if (renderer) {
          const preset = Config.PRESETS[currentPresetKey];
          const options = {
            easing: preset ? preset.easing || 'sine' : 'sine',
            elapsedBeats: engine.elapsedBeats,
            connectNeighbors: preset ? !!preset.connectNeighbors : false,
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
  presetSelect.addEventListener('change', async (e) => {
    const key = e.target.value;
    buildFromPreset(key);

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
      audioLayer.setVolume(parseInt(volumeSlider.value));
    }

    // Dispose old ambient layer and create a fresh one
    if (ambientLayer) {
      ambientLayer.dispose();
      ambientLayer = null;
    }
    ambientLayer = new AmbientLayer();
    ambientLayer.setVolume(parseInt(volumeSlider.value));

    // Trigger initial ambient chord for new preset
    const preset = Config.PRESETS[key];
    if (preset?.chordProgression?.length > 0) {
      const parsed = Config.parseChordSymbol(preset.chordProgression[0]);
      const padNotes = Config.getChordNotes(
        parsed.rootMidi,
        parsed.chordTypeKey,
      );
      ambientLayer.playChord(padNotes, (preset.ambientOctave ?? 0) * 12);

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
  });

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
    if (bpm < 0.01 || bpm > 120) return;
    bpmValue.textContent = bpm;
    if (engine) engine.setBpm(bpm);
    if (bpmNumber) bpmNumber.value = bpm;
  });
  bpmNumber.addEventListener('input', (e) => {
    const bpm = parseFloat(e.target.value);
    // if nan, do not set
    if (isNaN(bpm)) return;
    // if bpm is out of range, do not set
    if (bpm < 0.01 || bpm > 120) return;
    bpmValue.textContent = bpm;
    if (engine) engine.setBpm(bpm);
    if (bpmSlider) bpmSlider.value = bpm;
  });

  // ── Volume slider ──
  volumeSlider.addEventListener('input', (e) => {
    const vol = parseFloat(e.target.value);
    volumeValue.textContent = vol;
    if (audioLayer) audioLayer.setVolume(vol);
    if (ambientLayer) ambientLayer.setVolume(vol);
  });

  // ── Pause / Resume ──
  pauseBtn.addEventListener('click', () => {
    if (!engine) return;
    engine.toggle();
    pauseBtn.textContent = engine.isRunning ? 'Pause' : 'Resume';

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
          ambientLayer.playChord(padNotes, (preset.ambientOctave ?? 0) * 12);
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

  // Connect-neighbors checkbox updates the preset live
  const advConnectNeighbors = document.getElementById('adv-connect-neighbors');
  advConnectNeighbors.addEventListener('change', () => {
    const preset = Config.PRESETS[currentPresetKey];
    if (preset) preset.connectNeighbors = advConnectNeighbors.checked;
  });

  advancedBtn.addEventListener('click', () => {
    sidebar.classList.add('open');
    controlsPanel.classList.remove('open');
  });

  closeAdvanced.addEventListener('click', () => {
    sidebar.classList.remove('open');
  });

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
      ambientLayer.playChord(padNotes, oct * 12);
    }
  });

  // Range updates
  ['adv-voice-count', 'adv-chord-ratio'].forEach((id) => {
    const el = document.getElementById(id);
    const val = document.getElementById(id + '-val');
    el.addEventListener('input', () => (val.textContent = el.value));
  });

  // Removed invalid listeners for ratio-start/end-val since they don't exist in new UI

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
      easing,
      bpm: engine.bpm,
    };

    // Update UI
    let customOpt = presetSelect.querySelector('option[value="custom"]');
    if (!customOpt) {
      customOpt = document.createElement('option');
      customOpt.value = 'custom';
      customOpt.textContent = 'Custom Configuration';
      presetSelect.appendChild(customOpt);
    }
    presetSelect.value = 'custom';
    if (chordProgression.length > 0) {
      const firstParsed = Config.parseChordSymbol(chordProgression[0]);
      infoPreset.textContent = `Custom (${firstParsed.displayName})`;
    } else {
      infoPreset.textContent = 'Custom Configuration';
    }

    // Reinit Audio & Renderer
    await audioLayer.reinit(engine.voices);
    audioLayer.setVolume(parseInt(volumeSlider.value));

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
    ambientLayer.setVolume(parseInt(volumeSlider.value));

    // Trigger initial ambient chord and re-tune voices
    if (chordProgression.length > 0) {
      const parsed = Config.parseChordSymbol(chordProgression[0]);
      const padNotes = Config.getChordNotes(
        parsed.rootMidi,
        parsed.chordTypeKey,
      );
      ambientLayer.playChord(
        padNotes,
        (parseInt(advAmbientOctave.value) || 0) * 12,
      );

      // Re-tune voices
      retuneVoices(parsed, Config.PRESETS['custom'], engine.voices.length);
    }

    // Sidebar stays open for rapid iteration
    if (!engine.isRunning) engine.start();
  });
})();
