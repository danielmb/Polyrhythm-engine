/**
 * bouncing-boxes.js — Bouncing boxes scene.
 * N boxes bouncing vertically with trigger flash and particles.
 */

const BouncingBoxesScene = {
  name: 'Bouncing Boxes',
  particles: [],
  maxParticles: 80,

  setup(voices, w, h) {
    this.particles = [];
  },

  draw(p, voices, w, h, options = {}) {
    const n = voices.length;
    const spacing = w / (n + 1);
    const bounceHeight = h * 0.55;
    const baseY = h * 0.82;
    const boxSize = Math.min(spacing * 0.4, 60);

    // ── Visual settings ──
    const vis = options.vis || {};
    const noteSize = vis.noteSize != null ? vis.noteSize : 1.0;
    const glowInt = vis.glowIntensity != null ? vis.glowIntensity : 1.0;
    const flashInt = vis.flashIntensity != null ? vis.flashIntensity : 1.0;
    const trailOp = vis.trailOpacity != null ? vis.trailOpacity : 1.0;
    const lineOp = vis.lineOpacity != null ? vis.lineOpacity : 1.0;
    const lineThk = vis.lineThickness != null ? vis.lineThickness : 1.0;
    const satMul = vis.colorSaturation != null ? vis.colorSaturation : 1.0;
    const briMul = vis.colorBrightness != null ? vis.colorBrightness : 1.0;
    const mono = vis.monochrome || false;
    const showTrails = vis.showTrails !== false; // particles = trails here
    const showTriggers = vis.showTriggers !== false;
    const style = vis.noteStyle || 'glow';

    const cHue = (h) => (mono ? 0 : h);
    const cSat = (s) => (mono ? 0 : Math.min(100, s * satMul));
    const cBri = (b) => Math.min(100, b * briMul);

    // ── Update & draw particles ──
    for (let j = this.particles.length - 1; j >= 0; j--) {
      const pt = this.particles[j];
      pt.x += pt.vx;
      pt.y += pt.vy;
      pt.vy += 0.15;
      pt.life -= 0.02;
      if (pt.life <= 0) {
        this.particles.splice(j, 1);
        continue;
      }
      if (!showTrails) continue;
      p.push();
      p.colorMode(p.HSB, 360, 100, 100, 100);
      p.noStroke();
      p.fill(cHue(pt.hue), cSat(60), cBri(90), pt.life * 60 * trailOp);
      p.ellipse(pt.x, pt.y, 3 * pt.life, 3 * pt.life);
      p.pop();
    }

    // ── Draw ground line ──
    p.push();
    p.stroke(255, 255, 255, 8 * lineOp);
    p.strokeWeight(1 * lineThk);
    p.line(
      spacing * 0.5,
      baseY + boxSize * 0.5 + 4,
      w - spacing * 0.5,
      baseY + boxSize * 0.5 + 4,
    );
    p.pop();

    // Pre-compute box positions
    const positions = [];
    for (let i = 0; i < n; i++) {
      const voice = voices[i];
      const baseCx = spacing * (i + 1);

      const ofsX =
        (voice.spatialOffset ? voice.spatialOffset.x : 0) * spacing * 1.2;
      const ofsY = (voice.spatialOffset ? voice.spatialOffset.y : 0) * h * 0.15;
      const cx = baseCx + ofsX;
      const adjustedBaseY = baseY + ofsY;

      const visualPhase = (voice.phase + (voice.visualPhaseOffset || 0)) % 1;
      const bouncePhase = Math.abs(Math.sin(visualPhase * Math.PI));
      const boxY = adjustedBaseY - bouncePhase * bounceHeight;

      positions.push({ cx, boxY, adjustedBaseY });
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
        const alpha = (6 + maxGlow * 40) * lineOp;
        p.stroke(cHue(avgHue), cSat(45), cBri(80), alpha);
        p.strokeWeight((0.5 + maxGlow * 1.5) * lineThk);
        p.line(a.cx, a.boxY, b.cx, b.boxY);
      }
      p.pop();
    }

    // ── Draw boxes ──
    for (let i = 0; i < n; i++) {
      const voice = voices[i];
      const { cx, boxY, adjustedBaseY } = positions[i];

      const [hue, sat, bri] = voice.color;
      const h0 = cHue(hue);
      const glow = voice.triggerGlow || 0;
      const pulseSize = (boxSize + voice.amplitude * boxSize * 0.3) * noteSize;

      p.push();
      p.colorMode(p.HSB, 360, 100, 100, 100);
      p.rectMode(p.CENTER);

      if (style === 'minimal') {
        // Clean flat box, white flash on trigger
        p.noStroke();
        const flashBri = mono ? 100 : cBri(bri + glow * 30);
        p.fill(
          h0,
          cSat(sat * 0.1),
          flashBri,
          60 + voice.amplitude * 40 + glow * 50,
        );
        p.rect(cx, boxY, pulseSize, pulseSize, 6);
        if (glow > 0.01) {
          p.fill(h0, cSat(sat * 0.05), 100, glow * 70 * flashInt);
          p.rect(
            cx,
            boxY,
            pulseSize * (1.3 + glow * 0.5),
            pulseSize * (1.3 + glow * 0.5),
            8,
          );
        }
      } else if (style === 'neon') {
        // Neon stroke box
        p.noFill();
        p.stroke(h0, cSat(sat * 0.8), cBri(100), 60 + glow * 40);
        p.strokeWeight(2 * noteSize);
        p.rect(cx, boxY, pulseSize, pulseSize, 6);
        if (glowInt > 0) {
          p.stroke(h0, cSat(sat * 0.5), cBri(100), (12 + glow * 35) * glowInt);
          p.strokeWeight(4 * noteSize);
          p.rect(cx, boxY, pulseSize * 1.5, pulseSize * 1.5, 10);
        }
      } else if (style === 'solid') {
        // Flat filled box
        p.noStroke();
        p.fill(
          h0,
          cSat(sat * 0.7),
          cBri(bri),
          70 + voice.amplitude * 30 + glow * 20,
        );
        p.rect(cx, boxY, pulseSize, pulseSize, 8);
      } else if (style === 'ring') {
        // Hollow box with thick stroke
        p.noFill();
        p.stroke(
          h0,
          cSat(sat * 0.6),
          cBri(bri),
          50 + voice.amplitude * 40 + glow * 30,
        );
        p.strokeWeight((2 + glow * 2) * noteSize);
        p.rect(cx, boxY, pulseSize, pulseSize, 8);
      } else if (style === 'dot') {
        // Tiny circle instead of box
        p.noStroke();
        p.fill(h0, cSat(sat * 0.3), 100, 70 + voice.amplitude * 30 + glow * 50);
        p.ellipse(cx, boxY, pulseSize * 0.4, pulseSize * 0.4);
      } else if (style === 'ghost') {
        // Large transparent box
        p.noStroke();
        p.fill(
          h0,
          cSat(sat * 0.3),
          cBri(bri),
          (8 + voice.amplitude * 12 + glow * 15) * glowInt,
        );
        p.rect(cx, boxY, pulseSize * 2.5, pulseSize * 2.5, 20);
        p.fill(h0, cSat(sat * 0.2), 100, 10 + voice.amplitude * 15 + glow * 20);
        p.rect(cx, boxY, pulseSize * 0.8, pulseSize * 0.8, 4);
      } else {
        // Glow (default)
        p.noStroke();
        if (glowInt > 0) {
          p.fill(
            h0,
            cSat(sat * 0.5),
            cBri(bri),
            (5 + voice.amplitude * 12 + glow * 18) * glowInt,
          );
          p.rect(
            cx,
            boxY,
            pulseSize * (2.5 + glow),
            pulseSize * (2.5 + glow),
            20,
          );
          p.fill(
            h0,
            cSat(sat * 0.6),
            cBri(bri),
            (8 + voice.amplitude * 18 + glow * 15) * glowInt,
          );
          p.rect(cx, boxY, pulseSize * 1.6, pulseSize * 1.6, 14);
        }
        // Main box
        p.fill(
          h0,
          cSat(sat * (0.7 - glow * 0.3)),
          cBri(bri + glow * 15),
          30 + voice.amplitude * 50 + glow * 25,
        );
        p.stroke(
          h0,
          cSat(sat * 0.4),
          cBri(bri),
          15 + voice.amplitude * 30 + glow * 20,
        );
        p.strokeWeight(1);
        p.rect(cx, boxY, pulseSize, pulseSize, 8);
        // Bright inner
        p.noStroke();
        p.fill(h0, cSat(sat * 0.2), 100, 10 + voice.amplitude * 30 + glow * 20);
        p.rect(cx, boxY, pulseSize * 0.5, pulseSize * 0.5, 4);
      }

      p.pop();

      // ── Spawn particles on trigger ──
      if (
        voice.triggered &&
        showTrails &&
        this.particles.length < this.maxParticles
      ) {
        const count = 6 + Math.floor(Math.random() * 4);
        for (let k = 0; k < count; k++) {
          this.particles.push({
            x: cx + (Math.random() - 0.5) * boxSize,
            y: adjustedBaseY,
            vx: (Math.random() - 0.5) * 3,
            vy: -Math.random() * 4 - 1,
            hue: hue,
            life: 0.7 + Math.random() * 0.3,
          });
        }
      }

      // ── Trigger line ──
      if (showTriggers && glow > 0.01 && flashInt > 0) {
        p.push();
        p.colorMode(p.HSB, 360, 100, 100, 100);
        p.stroke(h0, cSat(sat * 0.5), 100, glow * 35 * flashInt);
        p.strokeWeight((0.5 + glow * 1.5) * lineThk);
        p.line(cx, adjustedBaseY + boxSize * 0.5, cx, boxY);
        p.pop();
      }

      // ── Column label glow at bottom ──
      if (voice.amplitude > 0.1 && glowInt > 0) {
        p.push();
        p.colorMode(p.HSB, 360, 100, 100, 100);
        p.noStroke();
        p.fill(h0, cSat(sat * 0.4), cBri(bri), voice.amplitude * 25 * glowInt);
        p.ellipse(
          cx,
          adjustedBaseY + boxSize * 0.5 + 4,
          voice.amplitude * 60,
          3,
        );
        p.pop();
      }
    }

    // ── Chord Change Flash ──
    const ccGlow = options.chordChangeGlow || 0;
    if (ccGlow > 0.01 && showTriggers && flashInt > 0) {
      p.push();
      p.colorMode(p.HSB, 360, 100, 100, 100);
      // Ground flash
      p.stroke(cHue(220), cSat(25), 100, ccGlow * 45 * flashInt);
      p.strokeWeight((2 + ccGlow * 3) * lineThk);
      p.line(
        spacing * 0.5,
        baseY + boxSize * 0.5 + 4,
        w - spacing * 0.5,
        baseY + boxSize * 0.5 + 4,
      );
      // Expanding ring
      const ringR = Math.min(w, h) * 0.1 * (1 + (1 - ccGlow) * 4);
      p.noFill();
      p.stroke(cHue(270), cSat(20), 100, ccGlow * 30 * flashInt);
      p.strokeWeight((1.5 + ccGlow * 2) * lineThk);
      p.ellipse(w / 2, baseY, ringR * 2, ringR * 2);
      // Soft screen tint
      p.noStroke();
      p.fill(cHue(240), mono ? 0 : 10, 100, ccGlow * 8 * flashInt);
      p.rect(0, 0, w, h);
      p.pop();
    }
  },

  teardown() {
    this.particles = [];
  },
};
