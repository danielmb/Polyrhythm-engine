/**
 * circular-orbits.js — Circular orbits scene.
 * N circles orbiting a central point at different radii and speeds.
 */

const CircularOrbitsScene = {
  name: 'Circular Orbits',
  trails: [],
  maxTrails: 150,
  supernovaParticles: [],
  _sunFlicker: 0,

  setup(voices, w, h) {
    this.trails = [];
    this.supernovaParticles = [];
    this._sunFlicker = 0;
  },

  draw(p, voices, w, h, options = {}) {
    const cx = w / 2;
    const cy = h / 2;
    const n = voices.length;
    const maxRadius = Math.min(w, h) * 0.38;
    const minRadius = Math.min(w, h) * 0.1;
    const spatialScale = maxRadius * 0.35;
    const orbitShape = options.orbitPath || 'circle';

    // ── Visual settings ──
    const vis = options.vis || {};
    const noteSize = vis.noteSize != null ? vis.noteSize : 1.0;
    const glowInt = vis.glowIntensity != null ? vis.glowIntensity : 1.0;
    const flashInt = vis.flashIntensity != null ? vis.flashIntensity : 1.0;
    const trailLen = vis.trailLength != null ? vis.trailLength : 1.0;
    const trailOp = vis.trailOpacity != null ? vis.trailOpacity : 1.0;
    const lineOp = vis.lineOpacity != null ? vis.lineOpacity : 1.0;
    const lineThk = vis.lineThickness != null ? vis.lineThickness : 1.0;
    const pathOp = vis.pathOpacity != null ? vis.pathOpacity : 1.0;
    const satMul = vis.colorSaturation != null ? vis.colorSaturation : 1.0;
    const briMul = vis.colorBrightness != null ? vis.colorBrightness : 1.0;
    const mono = vis.monochrome || false;
    const showPaths = vis.showPaths !== false;
    const showTrails = vis.showTrails !== false;
    const showTriggers = vis.showTriggers !== false;
    const style = vis.noteStyle || 'glow';
    const theme = vis.sceneTheme || 'default';

    const cHue = (h) => (mono ? 0 : h);
    const cSat = (s) => (mono ? 0 : Math.min(100, s * satMul));
    const cBri = (b) => Math.min(100, b * briMul);

    // Pre-compute orbiter positions
    const positions = [];
    for (let i = 0; i < n; i++) {
      const voice = voices[i];
      const r = minRadius + (maxRadius - minRadius) * (i / Math.max(n - 1, 1));
      const ofsX =
        (voice.spatialOffset ? voice.spatialOffset.x : 0) * spatialScale;
      const ofsY =
        (voice.spatialOffset ? voice.spatialOffset.y : 0) * spatialScale;
      const orbitCx = cx + ofsX;
      const orbitCy = cy + ofsY;
      const visualPhase = (voice.phase + (voice.visualPhaseOffset || 0)) % 1;
      const pos = Config.getOrbitShapePosition(orbitShape, visualPhase);
      positions.push({
        ox: orbitCx + pos.x * r,
        oy: orbitCy + pos.y * r,
        orbitCx,
        orbitCy,
        r,
      });
    }

    // ── Draw orbit paths ──
    if (showPaths && pathOp > 0) {
      p.push();
      p.colorMode(p.HSB, 360, 100, 100, 100);
      p.noFill();
      const pathSteps = 80;
      for (let i = 0; i < n; i++) {
        const { orbitCx, orbitCy, r } = positions[i];
        p.stroke(cHue(voices[i].color[0]), cSat(15), cBri(30), 8 * pathOp);
        p.strokeWeight(0.8);
        p.beginShape();
        for (let s = 0; s <= pathSteps; s++) {
          const phase = s / pathSteps;
          const pt = Config.getOrbitShapePosition(orbitShape, phase);
          p.vertex(orbitCx + pt.x * r, orbitCy + pt.y * r);
        }
        p.endShape(p.CLOSE);
      }
      p.pop();
    }

    // ── Draw neighbor connection lines ──
    if (options.connectNeighbors && n > 1 && lineOp > 0) {
      p.push();
      p.colorMode(p.HSB, 360, 100, 100, 100);
      for (let i = 0; i < n - 1; i++) {
        const a = positions[i];
        const b = positions[i + 1];
        const [hueA] = voices[i].color;
        const [hueB] = voices[i + 1].color;
        const avgHue = (hueA + hueB) / 2;
        const maxGlow = Math.max(
          voices[i].triggerGlow || 0,
          voices[i + 1].triggerGlow || 0,
        );
        const trigAlpha = (6 + maxGlow * 40) * lineOp;
        p.stroke(cHue(avgHue), cSat(40), cBri(80), trigAlpha);
        p.strokeWeight((0.5 + maxGlow * 1.5) * lineThk);
        p.line(a.ox, a.oy, b.ox, b.oy);
      }
      p.pop();
    }

    // ── Update & draw trails ──
    const maxTrailCount = Math.floor(this.maxTrails * trailLen);
    for (let j = this.trails.length - 1; j >= 0; j--) {
      const t = this.trails[j];
      t.life -= 0.015 / Math.max(trailLen, 0.1);
      if (t.life <= 0) {
        this.trails.splice(j, 1);
        continue;
      }
      if (!showTrails) continue;
      p.push();
      p.colorMode(p.HSB, 360, 100, 100, 100);
      p.noStroke();
      p.fill(
        cHue(t.hue),
        cSat(t.sat * 0.5),
        cBri(t.bri),
        t.life * 15 * trailOp,
      );
      p.ellipse(t.x, t.y, t.size * t.life, t.size * t.life);
      p.pop();
    }

    // ── Draw center ──
    if (theme === 'solar') {
      // ── SOLAR SYSTEM: Draw the Sun ──
      this._sunFlicker = (this._sunFlicker || 0) + 0.03;
      const sunBaseR = minRadius * 0.9;
      const flicker =
        Math.sin(this._sunFlicker * 2.3) * 0.04 +
        Math.sin(this._sunFlicker * 5.7) * 0.02;
      const sunR = sunBaseR * (1 + flicker);

      // Aggregate voice activity for sun "heartbeat"
      let totalActivity = 0;
      for (let i = 0; i < n; i++) {
        totalActivity += voices[i].amplitude || 0;
        totalActivity += (voices[i].triggerGlow || 0) * 0.5;
      }
      const sunPulse = Math.min(totalActivity / Math.max(n, 1), 1);

      p.push();
      p.colorMode(p.HSB, 360, 100, 100, 100);
      p.noStroke();

      // Distant corona (very large, faint)
      p.fill(30, mono ? 0 : 30, cBri(100), (1.5 + sunPulse * 3) * glowInt);
      p.ellipse(cx, cy, sunR * 8, sunR * 8);

      // Outer corona — warm orange glow
      p.fill(35, mono ? 0 : 50, cBri(95), (3 + sunPulse * 6) * glowInt);
      p.ellipse(cx, cy, sunR * 5, sunR * 5);

      // Mid corona — yellow-orange
      p.fill(40, mono ? 0 : 60, cBri(100), (6 + sunPulse * 8) * glowInt);
      p.ellipse(cx, cy, sunR * 3.2, sunR * 3.2);

      // Inner glow — bright yellow
      p.fill(45, mono ? 0 : 70, cBri(100), (15 + sunPulse * 15) * glowInt);
      p.ellipse(cx, cy, sunR * 2.2, sunR * 2.2);

      // Sun surface — hot white-yellow core
      p.fill(50, mono ? 0 : 55, cBri(100), 50 + sunPulse * 20);
      p.ellipse(cx, cy, sunR * 1.4, sunR * 1.4);

      // White-hot center
      p.fill(55, mono ? 0 : 20, 100, 65 + sunPulse * 25);
      p.ellipse(cx, cy, sunR * 0.9, sunR * 0.9);

      // Sunspot-like dark patches (subtle, rotating)
      const spotAngle = this._sunFlicker * 0.4;
      p.fill(25, mono ? 0 : 80, 30, 8);
      p.ellipse(
        cx + Math.cos(spotAngle) * sunR * 0.25,
        cy + Math.sin(spotAngle) * sunR * 0.25,
        sunR * 0.2,
        sunR * 0.15,
      );
      p.ellipse(
        cx + Math.cos(spotAngle + 2.5) * sunR * 0.35,
        cy + Math.sin(spotAngle + 2.5) * sunR * 0.35,
        sunR * 0.12,
        sunR * 0.1,
      );

      // Solar flare tendrils (subtle arcs that pulse)
      const flarePhase = this._sunFlicker;
      for (let f = 0; f < 3; f++) {
        const fa = flarePhase * 0.3 + (f * Math.PI * 2) / 3;
        const flareLen =
          sunR * (0.8 + Math.sin(flarePhase * 1.5 + f * 2) * 0.4);
        const flareBri = (3 + Math.sin(flarePhase * 2 + f) * 2) * glowInt;
        p.fill(35 + f * 5, mono ? 0 : 60, cBri(100), flareBri);
        p.ellipse(
          cx + Math.cos(fa) * (sunR * 0.7 + flareLen * 0.5),
          cy + Math.sin(fa) * (sunR * 0.7 + flareLen * 0.5),
          flareLen * 0.6,
          flareLen * 0.2,
        );
      }

      p.pop();
    } else {
      // ── DEFAULT: small center glow ──
      if (glowInt > 0) {
        p.push();
        p.noStroke();
        p.fill(cHue(240), mono ? 0 : 20, 50, 3 * glowInt);
        p.ellipse(cx, cy, minRadius * 1.5, minRadius * 1.5);
        p.fill(cHue(240), mono ? 0 : 10, cBri(80), 5 * glowInt);
        p.ellipse(cx, cy, 10, 10);
        p.pop();
      }
    }

    // ── Draw orbiters ──
    for (let i = 0; i < n; i++) {
      const voice = voices[i];
      const { ox, oy } = positions[i];

      const [hue, sat, bri] = voice.color;
      const h0 = cHue(hue);
      const baseSize = Math.min(w, h) * 0.02 * noteSize;
      const glow = voice.triggerGlow || 0;
      const activity = Math.max(voice.amplitude || 0, glow);
      const idle = 1 - Math.min(activity, 1);
      const size = baseSize + voice.amplitude * baseSize * 2;

      // Leave trail
      if (showTrails && this.trails.length < maxTrailCount) {
        this.trails.push({
          x: ox,
          y: oy,
          hue,
          sat,
          bri,
          size: size * 0.8,
          life: 0.6 + voice.amplitude * 0.4,
        });
      }

      p.push();
      p.colorMode(p.HSB, 360, 100, 100, 100);
      p.noStroke();

      if (style === 'minimal') {
        // Clean white/tinted circle that flashes bright white on trigger
        const flashBri = mono ? 100 : cBri(bri + glow * 30);
        p.fill(
          h0,
          cSat(sat * 0.1),
          flashBri,
          60 + voice.amplitude * 40 + glow * 50,
        );
        p.ellipse(ox, oy, size, size);
        if (glow > 0.01) {
          p.fill(h0, cSat(sat * 0.05), 100, glow * 80 * flashInt);
          p.ellipse(ox, oy, size * (1.5 + glow), size * (1.5 + glow));
        }
      } else if (style === 'neon') {
        // Hard bright stroked rings, retro-neon feel
        p.noFill();
        p.stroke(h0, cSat(sat * 0.8), cBri(100), 60 + glow * 40);
        p.strokeWeight(2 * noteSize);
        p.ellipse(ox, oy, size * 1.5, size * 1.5);
        if (glowInt > 0) {
          p.stroke(h0, cSat(sat * 0.5), cBri(100), (15 + glow * 40) * glowInt);
          p.strokeWeight(4 * noteSize);
          p.ellipse(ox, oy, size * 2.5, size * 2.5);
        }
        p.noStroke();
        p.fill(h0, cSat(sat * 0.3), 100, 30 + glow * 40);
        p.ellipse(ox, oy, size * 0.4, size * 0.4);
      } else if (style === 'solid') {
        // Flat filled circle, no glow
        p.fill(
          h0,
          cSat(sat * 0.7),
          cBri(bri),
          70 + voice.amplitude * 30 + glow * 20,
        );
        p.ellipse(ox, oy, size * 1.2, size * 1.2);
      } else if (style === 'ring') {
        // Hollow circle with thick stroke
        p.noFill();
        p.stroke(
          h0,
          cSat(sat * 0.6),
          cBri(bri),
          50 + voice.amplitude * 40 + glow * 30,
        );
        p.strokeWeight((2 + glow * 2) * noteSize);
        p.ellipse(ox, oy, size * 1.5, size * 1.5);
        if (glow > 0.01 && glowInt > 0) {
          p.stroke(h0, cSat(sat * 0.3), 100, glow * 40 * glowInt);
          p.strokeWeight(1 * noteSize);
          p.ellipse(ox, oy, size * (3 + glow * 2), size * (3 + glow * 2));
        }
      } else if (style === 'dot') {
        // Tiny bright dot
        p.fill(h0, cSat(sat * 0.3), 100, 70 + voice.amplitude * 30 + glow * 50);
        p.ellipse(ox, oy, size * 0.5, size * 0.5);
      } else if (style === 'ghost') {
        // Very transparent, large, dreamy presence
        p.fill(
          h0,
          cSat(sat * 0.3),
          cBri(bri),
          (8 + voice.amplitude * 12 + glow * 15) * glowInt,
        );
        p.ellipse(ox, oy, size * (5 + glow * 2), size * (5 + glow * 2));
        p.fill(h0, cSat(sat * 0.2), 100, 10 + voice.amplitude * 15 + glow * 20);
        p.ellipse(ox, oy, size * 1.5, size * 1.5);
      } else {
        // Glow (default): multi-layer glow
        if (idle > 0.05 && glowInt > 0) {
          p.fill(0, 0, 0, idle * 8 * glowInt);
          p.ellipse(ox, oy, size * (5 + idle * 2), size * (5 + idle * 2));
        }
        if (glowInt > 0) {
          p.fill(
            h0,
            cSat(sat * 0.5),
            cBri(bri),
            (4 + voice.amplitude * 12 + glow * 20) * glowInt,
          );
          p.ellipse(ox, oy, size * (4 + glow * 2), size * (4 + glow * 2));
          p.fill(
            h0,
            cSat(sat * 0.6),
            cBri(bri),
            (8 + voice.amplitude * 20 + glow * 15) * glowInt,
          );
          p.ellipse(ox, oy, size * 2.5, size * 2.5);
        }
        p.fill(
          h0,
          cSat(sat * (0.6 - glow * 0.3)),
          cBri(bri + glow * 20),
          40 + voice.amplitude * 55 + glow * 30,
        );
        p.ellipse(ox, oy, size * (1 + glow * 0.3), size * (1 + glow * 0.3));
        p.fill(h0, cSat(sat * 0.2), 100, 20 + voice.amplitude * 40 + glow * 20);
        p.ellipse(ox, oy, size * 0.35, size * 0.35);
      }

      p.pop();

      // ── Trigger effects ──
      if (showTriggers && glow > 0.01 && flashInt > 0) {
        // Solar theme: warm orange triggers, default: voice color
        const trigHue = theme === 'solar' ? cHue(40) : h0;
        const trigSat = theme === 'solar' ? cSat(60) : cSat(sat * 0.4);

        p.push();
        p.colorMode(p.HSB, 360, 100, 100, 100);
        p.noFill();
        p.stroke(trigHue, trigSat, 100, glow * 50 * flashInt);
        p.strokeWeight(1 + glow);
        p.ellipse(
          ox,
          oy,
          size * (4 + (1 - glow) * 4),
          size * (4 + (1 - glow) * 4),
        );
        p.pop();

        p.push();
        p.colorMode(p.HSB, 360, 100, 100, 100);
        p.stroke(trigHue, trigSat, 100, glow * 40 * flashInt);
        p.strokeWeight((0.5 + glow * 1.5) * lineThk);
        p.line(cx, cy, ox, oy);
        p.pop();

        p.push();
        p.colorMode(p.HSB, 360, 100, 100, 100);
        p.noStroke();
        // Solar: sun brightens on trigger, default: small flash
        if (theme === 'solar') {
          p.fill(45, mono ? 0 : 30, 100, glow * 35 * flashInt);
          p.ellipse(
            cx,
            cy,
            minRadius * 0.8 + glow * 12,
            minRadius * 0.8 + glow * 12,
          );
        } else {
          p.fill(h0, cSat(sat * 0.3), 100, glow * 25 * flashInt);
          p.ellipse(cx, cy, 8 + glow * 6, 8 + glow * 6);
        }
        p.pop();
      }
    }

    // ── Chord Change Effect ──
    const ccGlow = options.chordChangeGlow || 0;

    if (theme === 'solar') {
      // ── SOLAR SYSTEM: Supernova! ──

      // Spawn supernova particles on new chord change
      if (ccGlow > 0.95 && this.supernovaParticles.length < 60) {
        const burstCount = 30 + Math.floor(Math.random() * 20);
        for (let k = 0; k < burstCount; k++) {
          const angle = Math.random() * Math.PI * 2;
          const speed = 2 + Math.random() * 8;
          this.supernovaParticles.push({
            x: cx,
            y: cy,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed,
            hue: 30 + Math.random() * 30, // orange-yellow range
            size: 2 + Math.random() * 4,
            life: 0.8 + Math.random() * 0.5,
          });
        }
      }

      // Update & draw supernova particles
      for (let j = this.supernovaParticles.length - 1; j >= 0; j--) {
        const sp = this.supernovaParticles[j];
        sp.x += sp.vx;
        sp.y += sp.vy;
        sp.vx *= 0.98; // drag
        sp.vy *= 0.98;
        sp.life -= 0.015;
        if (sp.life <= 0) {
          this.supernovaParticles.splice(j, 1);
          continue;
        }
        p.push();
        p.colorMode(p.HSB, 360, 100, 100, 100);
        p.noStroke();
        // Hot core to cool tail
        const spHue = sp.hue + (1 - sp.life) * 180; // yellow → blue as it cools
        const spSat = mono ? 0 : 50 + sp.life * 30;
        p.fill(cHue(spHue), spSat, cBri(100), sp.life * 70);
        p.ellipse(sp.x, sp.y, sp.size * sp.life, sp.size * sp.life);
        // Hot tail glow
        p.fill(cHue(spHue), spSat * 0.5, cBri(100), sp.life * 25);
        p.ellipse(sp.x, sp.y, sp.size * sp.life * 3, sp.size * sp.life * 3);
        p.pop();
      }

      if (ccGlow > 0.01 && flashInt > 0) {
        p.push();
        p.colorMode(p.HSB, 360, 100, 100, 100);

        // Massive white-hot core flash
        p.noStroke();
        p.fill(50, mono ? 0 : 10, 100, ccGlow * 60 * flashInt);
        p.ellipse(cx, cy, minRadius * ccGlow * 6, minRadius * ccGlow * 6);

        // Expanding shockwave ring 1 — white-hot
        p.noFill();
        const shockR1 = minRadius * (1 + (1 - ccGlow) * 10);
        p.stroke(45, mono ? 0 : 20, 100, ccGlow * 55 * flashInt);
        p.strokeWeight(3 + ccGlow * 5);
        p.ellipse(cx, cy, shockR1 * 2, shockR1 * 2);

        // Expanding shockwave ring 2 — orange
        const shockR2 = minRadius * (1 + (1 - ccGlow) * 7);
        p.stroke(30, mono ? 0 : 50, 100, ccGlow * 40 * flashInt);
        p.strokeWeight(2 + ccGlow * 4);
        p.ellipse(cx, cy, shockR2 * 2, shockR2 * 2);

        // Expanding shockwave ring 3 — red-orange, slower
        const shockR3 = minRadius * (1 + (1 - ccGlow) * 5);
        p.stroke(15, mono ? 0 : 60, cBri(90), ccGlow * 30 * flashInt);
        p.strokeWeight(1.5 + ccGlow * 3);
        p.ellipse(cx, cy, shockR3 * 2, shockR3 * 2);

        // Inner supernova glow — blinding yellow
        p.noStroke();
        p.fill(50, mono ? 0 : 30, 100, ccGlow * 45 * flashInt);
        p.ellipse(cx, cy, minRadius * ccGlow * 3, minRadius * ccGlow * 3);

        // Orange corona expansion
        p.fill(35, mono ? 0 : 55, cBri(100), ccGlow * 20 * flashInt);
        p.ellipse(cx, cy, shockR2 * 0.8, shockR2 * 0.8);

        // Full-screen color wash — faint warm tint
        p.fill(40, mono ? 0 : 15, 100, ccGlow * 6 * flashInt);
        p.rect(0, 0, w, h);

        p.pop();
      }
    } else {
      // ── DEFAULT: Expanding rings ──
      if (ccGlow > 0.01 && showTriggers && flashInt > 0) {
        p.push();
        p.colorMode(p.HSB, 360, 100, 100, 100);
        p.noFill();
        const ringRadius = minRadius * (1 + (1 - ccGlow) * 6);
        p.stroke(cHue(220), cSat(30), 100, ccGlow * 40 * flashInt);
        p.strokeWeight(2 + ccGlow * 3);
        p.ellipse(cx, cy, ringRadius * 2, ringRadius * 2);
        const ring2 = minRadius * (1 + (1 - ccGlow) * 4);
        p.stroke(cHue(280), cSat(25), 100, ccGlow * 25 * flashInt);
        p.strokeWeight(1 + ccGlow * 2);
        p.ellipse(cx, cy, ring2 * 2, ring2 * 2);
        p.noStroke();
        p.fill(cHue(240), cSat(15), 100, ccGlow * 30 * flashInt);
        p.ellipse(cx, cy, minRadius * ccGlow * 3, minRadius * ccGlow * 3);
        p.pop();
      }
    }
  },

  teardown() {
    this.trails = [];
    this.supernovaParticles = [];
  },
};
