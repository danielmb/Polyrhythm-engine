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
    // Canvas is cleared and space background drawn by the renderer

    const n = voices.length;
    const spacing = w / (n + 1);
    const bounceHeight = h * 0.55;
    const baseY = h * 0.82;
    const boxSize = Math.min(spacing * 0.4, 60);

    // ── Update & draw particles ──
    for (let j = this.particles.length - 1; j >= 0; j--) {
      const pt = this.particles[j];
      pt.x += pt.vx;
      pt.y += pt.vy;
      pt.vy += 0.15; // gravity
      pt.life -= 0.02;
      if (pt.life <= 0) {
        this.particles.splice(j, 1);
        continue;
      }
      p.push();
      p.colorMode(p.HSB, 360, 100, 100, 100);
      p.noStroke();
      p.fill(pt.hue, 60, 90, pt.life * 60);
      p.ellipse(pt.x, pt.y, 3 * pt.life, 3 * pt.life);
      p.pop();
    }

    // ── Draw ground line ──
    p.push();
    p.stroke(255, 255, 255, 8);
    p.strokeWeight(1);
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

      // Spatial offset — shifts column position
      const ofsX =
        (voice.spatialOffset ? voice.spatialOffset.x : 0) * spacing * 1.2;
      const ofsY = (voice.spatialOffset ? voice.spatialOffset.y : 0) * h * 0.15;
      const cx = baseCx + ofsX;
      const adjustedBaseY = baseY + ofsY;

      // Apply visual phase offset — shifts starting position in the bounce
      const visualPhase = (voice.phase + (voice.visualPhaseOffset || 0)) % 1;
      const bouncePhase = Math.abs(Math.sin(visualPhase * Math.PI));
      const boxY = adjustedBaseY - bouncePhase * bounceHeight;

      positions.push({
        cx,
        boxY,
        adjustedBaseY,
      });
    }

    // ── Draw neighbor connection lines ──
    if (options.connectNeighbors && n > 1) {
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
        const alpha = 6 + maxGlow * 40;
        p.stroke(avgHue, 45, 80, alpha);
        p.strokeWeight(0.5 + maxGlow * 1.5);
        p.line(a.cx, a.boxY, b.cx, b.boxY);
      }
      p.pop();
    }

    // ── Draw boxes ──
    for (let i = 0; i < n; i++) {
      const voice = voices[i];
      const { cx, boxY, adjustedBaseY } = positions[i];

      const [hue, sat, bri] = voice.color;
      const glow = voice.triggerGlow || 0;
      const pulseSize = boxSize + voice.amplitude * boxSize * 0.3;

      p.push();
      p.colorMode(p.HSB, 360, 100, 100, 100);
      p.rectMode(p.CENTER);

      // Glow — boosted by triggerGlow
      p.noStroke();
      p.fill(hue, sat * 0.5, bri, 5 + voice.amplitude * 12 + glow * 18);
      p.rect(cx, boxY, pulseSize * (2.5 + glow), pulseSize * (2.5 + glow), 20);

      p.fill(hue, sat * 0.6, bri, 8 + voice.amplitude * 18 + glow * 15);
      p.rect(cx, boxY, pulseSize * 1.6, pulseSize * 1.6, 14);

      // Main box — brighter with glow
      p.fill(
        hue,
        sat * (0.7 - glow * 0.3),
        bri + glow * 15,
        30 + voice.amplitude * 50 + glow * 25,
      );
      p.stroke(hue, sat * 0.4, bri, 15 + voice.amplitude * 30 + glow * 20);
      p.strokeWeight(1);
      p.rect(cx, boxY, pulseSize, pulseSize, 8);

      // Bright inner
      p.noStroke();
      p.fill(hue, sat * 0.2, 100, 10 + voice.amplitude * 30 + glow * 20);
      p.rect(cx, boxY, pulseSize * 0.5, pulseSize * 0.5, 4);

      p.pop();

      // ── Spawn particles on trigger ──
      if (voice.triggered && this.particles.length < this.maxParticles) {
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

      // ── Trigger line — vertical flash that fades with glow ──
      if (glow > 0.01) {
        p.push();
        p.colorMode(p.HSB, 360, 100, 100, 100);
        p.stroke(hue, sat * 0.5, 100, glow * 35);
        p.strokeWeight(0.5 + glow * 1.5);
        p.line(cx, adjustedBaseY + boxSize * 0.5, cx, boxY);
        p.pop();
      }

      // ── Column label glow at bottom ──
      if (voice.amplitude > 0.1) {
        p.push();
        p.colorMode(p.HSB, 360, 100, 100, 100);
        p.noStroke();
        p.fill(hue, sat * 0.4, bri, voice.amplitude * 25);
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
    if (ccGlow > 0.01) {
      p.push();
      p.colorMode(p.HSB, 360, 100, 100, 100);
      // Ground flash — bright line that fades
      p.stroke(220, 25, 100, ccGlow * 45);
      p.strokeWeight(2 + ccGlow * 3);
      p.line(
        spacing * 0.5,
        baseY + boxSize * 0.5 + 4,
        w - spacing * 0.5,
        baseY + boxSize * 0.5 + 4,
      );
      // Expanding ring from center
      const ringR = Math.min(w, h) * 0.1 * (1 + (1 - ccGlow) * 4);
      p.noFill();
      p.stroke(270, 20, 100, ccGlow * 30);
      p.strokeWeight(1.5 + ccGlow * 2);
      p.ellipse(w / 2, baseY, ringR * 2, ringR * 2);
      // Soft screen tint
      p.noStroke();
      p.fill(240, 10, 100, ccGlow * 8);
      p.rect(0, 0, w, h);
      p.pop();
    }
  },

  teardown() {
    this.particles = [];
  },
};
