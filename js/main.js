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
    infoPreset.textContent = cfg.preset.chordProgression 
      ? `${cfg.preset.name} (${cfg.preset.chordProgression[0]})`
      : cfg.preset.name;

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
    console.log(engine);
    await audioLayer.init(engine.voices);
    audioLayer.setVolume(parseInt(volumeSlider.value));

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
            currentChordIndex = (currentChordIndex + 1) % preset.chordProgression.length;
            const newRootName = preset.chordProgression[currentChordIndex];
            const newRootMidi = Config.noteNameToMidi(newRootName);
            const maxMidi = preset.maxNote ? Config.noteNameToMidi(preset.maxNote) : null;
            const newNotes = Config.getNotesForScale(newRootMidi, preset.scale, engine.voices.length, maxMidi);
            
            // Update voices (Harmony)
            engine.voices.forEach((voice, i) => {
              voice.note = newNotes[i];
            });
            
            // Trigger Ambient Pad
            if (ambientLayer) {
                // Get a 4-note chord based on new root
                const padNotes = Config.getNotesForScale(newRootMidi, preset.scale, 4);
                ambientLayer.playChord(padNotes);
            }
            
            // Update UI
            infoPreset.textContent = `${preset.name} (${newRootName})`;
          }
        }

        // Update audio
        audioLayer.update(engine.voices);

        // Draw scene
        if (renderer) {
          const preset = Config.PRESETS[currentPresetKey];
          const options = {
            easing: preset ? (preset.easing || 'sine') : 'sine',
            elapsedBeats: engine.elapsedBeats
          };
          renderer.draw(p, engine.voices, p.width, p.height, options);
        }

        // Update elapsed time display
        infoElapsed.textContent = engine.getElapsedFormatted();

        // ── Debug Info (Canvas Overlay) ──
        if (p.frameCount % 10 === 0) {
            const preset = Config.PRESETS[currentPresetKey];
            const chordName = preset?.chordProgression?.[currentChordIndex] || 'N/A';
            const fps = p.frameRate().toFixed(0);
            
            p.debugInfoStr = `FPS:     ${fps}
Time:    ${engine.getElapsedFormatted()}
Beats:   ${engine.elapsedBeats.toFixed(1)}
BPM:     ${engine.bpm}
Preset:  ${currentPresetKey}
Scene:   ${currentSceneKey}
Voices:  ${engine.voices.length}
Chord:   ${currentChordIndex + 1}/${preset?.chordProgression?.length || 1} (${chordName})
Vol:     ${audioLayer ? parseInt(Tone.Destination.volume.value) : '?'} dB`;
        }

        if (p.debugInfoStr) {
            p.push();
            p.resetMatrix();
            p.fill(0, 0, 0, 80); // Semi-transparent bg
            p.noStroke();
            p.rect(10, 10, 240, 150, 4);
            
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
            const progress = (engine.elapsedBeats % currentResolutionBeats) / currentResolutionBeats;
            progBar.style.width = `${progress * 100}%`;
        }
      };

      p.windowResized = () => {
        p.resizeCanvas(p.windowWidth, p.windowHeight);
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
    if (!controlsEl.contains(e.target) && controlsPanel.classList.contains('open')) {
      controlsPanel.classList.remove('open');
    }
  });

  // ── Preset change ──
  presetSelect.addEventListener('change', async (e) => {
    const key = e.target.value;
    buildFromPreset(key);

    if (audioLayer) {
      await audioLayer.reinit(engine.voices);
      audioLayer.setVolume(parseInt(volumeSlider.value));
    }

    if (renderer && renderer.p) {
      renderer.setScene(currentSceneKey, engine.voices, renderer.p.width, renderer.p.height);
    }

    // Restart engine
    engine.start();
    pauseBtn.textContent = 'Pause';
  });

  // ── Scene change ──
  sceneSelect.addEventListener('change', (e) => {
    currentSceneKey = e.target.value;
    if (renderer && renderer.p) {
      renderer.setScene(currentSceneKey, engine.voices, renderer.p.width, renderer.p.height);
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
  });

  // ── Pause / Resume ──
  pauseBtn.addEventListener('click', () => {
    if (!engine) return;
    engine.toggle();
    pauseBtn.textContent = engine.isRunning ? 'Pause' : 'Resume';
  });

  // ── Advanced Controls ──
  const advancedBtn = document.getElementById('advanced-btn');
  const sidebar = document.getElementById('advanced-sidebar');
  const closeAdvanced = document.getElementById('close-advanced');
  const applyCustomBtn = document.getElementById('apply-custom-btn');
  const advScale = document.getElementById('adv-scale');
  
  // Populate Scale Dropdown
  Object.keys(Config.SCALES).forEach(key => {
    const opt = document.createElement('option');
    opt.value = key;
    opt.textContent = Config.SCALES[key].name;
    advScale.appendChild(opt);
  });

  advancedBtn.addEventListener('click', () => {
    sidebar.classList.add('open');
    controlsPanel.classList.remove('open'); 
  });

  closeAdvanced.addEventListener('click', () => {
    sidebar.classList.remove('open');
  });

  // Range updates
  ['adv-voice-count', 'adv-chord-ratio'].forEach(id => {
    const el = document.getElementById(id);
    const val = document.getElementById(id + '-val');
    el.addEventListener('input', () => val.textContent = el.value);
  });

  // Removed invalid listeners for ratio-start/end-val since they don't exist in new UI

  // ── Resolution Calculation ──
  const resolutionDisplay = document.getElementById('resolution-display');
  function updateResolution() {
    const count = parseInt(document.getElementById('adv-voice-count').value);
    const rStart = parseFloat(document.getElementById('adv-ratio-start').value);
    const rEnd = parseFloat(document.getElementById('adv-ratio-end').value);
    const bpm = parseFloat(bpmSlider.value) || 60;
    
    if (isNaN(count)) return;
    
    const ratios = Config.createSmoothRatios(count, rStart, rEnd);
    const beats = Config.getPolyrhythmResolution(ratios);
    
    currentResolutionBeats = beats || 1;
    
    if (!beats) {
       resolutionDisplay.textContent = 'Resolution: N/A';
       return;
    }
    
    const seconds = beats * (60 / bpm);
    let timeStr = '';
    if (seconds > 31536000) timeStr = '> 1 year';
    else if (seconds > 86400) timeStr = `${(seconds/86400).toFixed(1)} days`;
    else if (seconds > 3600) timeStr = `${(seconds/3600).toFixed(1)}h`;
    else if (seconds > 60) timeStr = `${(seconds/60).toFixed(1)}m`;
    else timeStr = `${seconds.toFixed(1)}s`;
    
    // Check if excessively large
    if (beats > 1e9) resolutionDisplay.textContent = 'Cycle: Effectively Infinite';
    else resolutionDisplay.textContent = `Resolves in ${beats.toLocaleString()} beats (${timeStr})`;
  }

  // Attach listeners for resolution update
  ['adv-voice-count', 'adv-ratio-start', 'adv-ratio-end'].forEach(id => {
      document.getElementById(id).addEventListener('input', updateResolution);
  });
  bpmSlider.addEventListener('input', updateResolution);
  bpmNumber.addEventListener('input', updateResolution);
  // Init
  updateResolution();

  // Apply Custom Config
  applyCustomBtn.addEventListener('click', async () => {
    const count = parseInt(document.getElementById('adv-voice-count').value);
    const rStart = parseFloat(document.getElementById('adv-ratio-start').value);
    const rEnd = parseFloat(document.getElementById('adv-ratio-end').value);
    
    // Generate ratios
    const ratios = Config.createSmoothRatios(count, rStart, rEnd);
    
    // Read Harmony
    const scaleKey = advScale.value;
    const easing = document.getElementById('adv-easing').value;
    const rootNote = document.getElementById('adv-root').value;
    const maxNote = document.getElementById('adv-max-note').value;
    
    // Read Progression
    const chordRatio = parseFloat(document.getElementById('adv-chord-ratio').value);
    const rawProg = document.getElementById('adv-progression').value;
    const chordProgression = rawProg.split(/\s+/).filter(s => s.length > 0);
    
    // Build Voice Config
    const rootMidi = Config.noteNameToMidi(rootNote);
    const maxMidi = maxNote ? Config.noteNameToMidi(maxNote) : null;
    const notes = Config.getNotesForScale(rootMidi, scaleKey, count, maxMidi);
    const colors = Config.generateColors(count);
    
    const voices = ratios.map((ratio, i) => ({
      ratio,
      note: notes[i],
      color: colors[i],
    }));
    
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
      scale: scaleKey,
      rootNote,
      maxNote,
      chordRatio,
      chordProgression,
      easing,
      bpm: engine.bpm
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
    infoPreset.textContent = chordProgression.length > 0 
      ? `Custom (${chordProgression[0]})` 
      : 'Custom Configuration';
    
    // Reinit Audio & Renderer
    await audioLayer.reinit(engine.voices);
    audioLayer.setVolume(parseInt(volumeSlider.value));
    
    if (renderer && renderer.p) {
      renderer.setScene(currentSceneKey, engine.voices, renderer.p.width, renderer.p.height);
    }
    
    // Sidebar stays open for rapid iteration
    if (!engine.isRunning) engine.start();
  });
})();
