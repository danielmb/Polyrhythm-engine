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

  draw(p, voices, w, h) {
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

    // ── Draw boxes ──
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

      const [hue, sat, bri] = voice.color;
      const pulseSize = boxSize + voice.amplitude * boxSize * 0.3;

      p.push();
      p.colorMode(p.HSB, 360, 100, 100, 100);
      p.rectMode(p.CENTER);

      // Glow
      p.noStroke();
      p.fill(hue, sat * 0.5, bri, 5 + voice.amplitude * 12);
      p.rect(cx, boxY, pulseSize * 2.5, pulseSize * 2.5, 20);

      p.fill(hue, sat * 0.6, bri, 8 + voice.amplitude * 18);
      p.rect(cx, boxY, pulseSize * 1.6, pulseSize * 1.6, 14);

      // Main box
      p.fill(hue, sat * 0.7, bri, 30 + voice.amplitude * 50);
      p.stroke(hue, sat * 0.4, bri, 15 + voice.amplitude * 30);
      p.strokeWeight(1);
      p.rect(cx, boxY, pulseSize, pulseSize, 8);

      // Bright inner
      p.noStroke();
      p.fill(hue, sat * 0.2, 100, 10 + voice.amplitude * 30);
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

        // Trigger line — vertical flash from ground to box
        p.push();
        p.colorMode(p.HSB, 360, 100, 100, 100);
        p.stroke(hue, sat * 0.5, 100, 35);
        p.strokeWeight(1.5);
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
  },

  teardown() {
    this.particles = [];
  },
};
