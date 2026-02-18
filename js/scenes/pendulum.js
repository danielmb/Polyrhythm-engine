/**
 * pendulum.js — Pendulum scene.
 * N pendulums swinging at voice-specific rates with glow and trails.
 */

const PendulumScene = {
  name: 'Pendulum',
  maxAngle: Math.PI / 4,
  lengthRatio: 0.55, // pendulum length as fraction of canvas height
  trails: [],
  maxTrails: 200,

  setup(voices, w, h) {
    this.trails = [];
  },

  draw(p, voices, w, h, options = {}) {
    // Canvas is cleared and space background drawn by the renderer

    // ── Draw & age trail history ──
    for (let j = this.trails.length - 1; j >= 0; j--) {
      const t = this.trails[j];
      t.life -= 0.018;
      if (t.life <= 0) {
        this.trails.splice(j, 1);
        continue;
      }
      p.push();
      p.colorMode(p.HSB, 360, 100, 100, 100);
      p.noStroke();
      p.fill(t.hue, t.sat * 0.5, t.bri, t.life * 18);
      p.ellipse(t.x, t.y, t.size * t.life, t.size * t.life);
      p.pop();
    }

    const n = voices.length;
    const cx = w / 2;
    const marginY = h * 0.1;
    const availH = h - marginY * 2;
    const spacing = n > 1 ? availH / (n - 1) : 0;
    const startY = n > 1 ? marginY : h / 2;

    const easing = options.easing || 'sine';

    // ── Center Trigger Line ──
    p.push();
    p.stroke(255, 255, 255, 8);
    p.strokeWeight(1);
    p.line(cx, marginY - 20, cx, h - marginY + 20);
    p.pop();

    for (let i = 0; i < n; i++) {
      const voice = voices[i];
      const baseY = startY + i * spacing;

      // Spatial offset — shifts anchor point
      const ofsX = (voice.spatialOffset ? voice.spatialOffset.x : 0) * w * 0.2;
      const ofsY = (voice.spatialOffset ? voice.spatialOffset.y : 0) * h * 0.15;
      const cy = baseY + ofsY;
      const anchorX = cx + ofsX;

      // ── Calculate Normalized Position with Cycle Sync ──
      // Apply visual phase offset — shifts starting position in the swing
      const totalPhase =
        (options.elapsedBeats || 0) * voice.ratio +
        (voice.visualPhaseOffset || 0);
      let normPos = 0;

      if (easing === 'linear') {
        // Triangle over 2 cycles: 0 -> 1 -> 0 -> -1 -> 0
        // Input: totalPhase (0..1..2)
        // p2 = totalPhase % 2.
        const p2 = totalPhase % 2;
        if (p2 < 0.5)
          normPos = p2 * 2; // 0 -> 1
        else if (p2 < 1.0)
          normPos = 2 - p2 * 2; // 1 -> 0
        else if (p2 < 1.5)
          normPos = -(p2 - 1) * 2; // 0 -> -1
        else normPos = -2 + (p2 - 1.5) * 2; // -1 -> 0
        // Wait, simplify:
        // p2 < 0.5: x
        // p2 < 1.5: 1 - (x-0.5) -> No.
        // Let's use Sawtooth-Triangle map:
        // x in 0..2.
        // val = 1 - abs((x % 2) - 1) * 2?
        // (x%2)-1 goes -1..0..1. abs goes 1..0..1. *2 goes 2..0..2. 1-val goes -1..1..-1.
        // Almost.
        // Let's stick to simple quadrants:
        if (p2 < 0.5) normPos = p2 * 2;
        else if (p2 < 1.5) normPos = 2 - p2 * 2;
        else normPos = p2 * 2 - 4;
      } else if (easing === 'bounce') {
        // Bounce: |sin(totalPhase * PI)|. 0 -> 1 -> 0.
        // Always positive swing (one side) as requested "touch center".
        // Touches center at integers.
        normPos = Math.abs(Math.sin(totalPhase * Math.PI));
      } else {
        // Sine: sin(totalPhase * PI)
        // 0 -> 1 (p=0.5) -> 0 (p=1, TRIG) -> -1 (p=1.5) -> 0 (p=2, TRIG)
        normPos = Math.sin(totalPhase * Math.PI);
      }

      const maxAngle = Math.PI * 0.55; // Wide swing
      const angle = normPos * maxAngle;

      const L = w * 0.4;

      const bobX = anchorX + Math.sin(angle) * L;
      const bobY = cy - L * (1 - Math.cos(angle));

      const visualY = bobY;

      const [hue, sat, bri] = voice.color;

      // ── Store trail point ──
      const baseRadius = Math.min(w, h) * 0.015;
      if (this.trails.length < this.maxTrails) {
        this.trails.push({
          x: bobX,
          y: visualY,
          hue,
          sat,
          bri,
          size: baseRadius * 1.5,
          life: 0.5 + voice.amplitude * 0.4,
        });
      }

      // ── String / Connector ──
      p.push();
      p.colorMode(p.HSB, 360, 100, 100, 100);
      p.stroke(hue, sat * 0.4, bri * 0.3, 30);
      p.strokeWeight(1.5);
      p.line(anchorX, cy, bobX, visualY);
      p.pop();

      // ── Glow layers ──
      p.push();
      p.colorMode(p.HSB, 360, 100, 100, 100);
      p.noStroke();

      const glow = voice.triggerGlow || 0;
      const pulseRadius = baseRadius + voice.amplitude * baseRadius * 1.8;

      // Outer glow — boosted by triggerGlow
      p.fill(hue, sat * 0.6, bri, 4 + voice.amplitude * 15 + glow * 20);
      p.ellipse(
        bobX,
        visualY,
        pulseRadius * (5 + glow * 2),
        pulseRadius * (5 + glow * 2),
      );

      // Core bob — brighter with glow
      p.fill(
        hue,
        sat * (0.5 - glow * 0.2),
        bri + glow * 15,
        60 + voice.amplitude * 40 + glow * 25,
      );
      p.ellipse(
        bobX,
        visualY,
        pulseRadius * (1 + glow * 0.2),
        pulseRadius * (1 + glow * 0.2),
      );

      p.pop();

      // ── Trigger Flash (fades with triggerGlow) ──
      if (glow > 0.01) {
        p.push();
        p.colorMode(p.HSB, 360, 100, 100, 100);

        // Flash on center trigger line
        p.noStroke();
        p.fill(hue, sat * 0.2, 100, glow * 50);
        p.ellipse(cx, cy, pulseRadius * 3 * glow, pulseRadius * 0.5);
        p.ellipse(cx, cy, pulseRadius * 0.5, pulseRadius * 3 * glow);

        // Line from center to bob — fades out
        p.stroke(hue, sat * 0.5, 100, glow * 40);
        p.strokeWeight(0.5 + glow * 1.5);
        p.line(cx, cy, bobX, visualY);

        // Ring ripple at bob — expands as it fades
        p.noFill();
        p.stroke(hue, sat * 0.5, 100, glow * 60);
        p.strokeWeight(1 + glow);
        p.ellipse(
          bobX,
          visualY,
          pulseRadius * (3 + (1 - glow) * 4),
          pulseRadius * (3 + (1 - glow) * 4),
        );

        p.pop();
      }
    }

    // ── Chord Change Flash ──
    const ccGlow = options.chordChangeGlow || 0;
    if (ccGlow > 0.01) {
      p.push();
      p.colorMode(p.HSB, 360, 100, 100, 100);
      // Horizontal light wave expanding from center line
      const waveW = w * (1 - ccGlow) * 0.5;
      p.noStroke();
      p.fill(220, 20, 100, ccGlow * 25);
      p.rectMode(p.CENTER);
      p.rect(cx, h / 2, waveW, h, 0);
      // Bright line at center
      p.stroke(260, 20, 100, ccGlow * 50);
      p.strokeWeight(1.5 + ccGlow * 2);
      p.line(cx, marginY - 20, cx, h - marginY + 20);
      p.pop();
    }
  },

  teardown() {
    this.trails = [];
  },
};
