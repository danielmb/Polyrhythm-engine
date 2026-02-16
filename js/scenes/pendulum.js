/**
 * pendulum.js — Pendulum scene.
 * N pendulums swinging at voice-specific rates with glow and trails.
 */

const PendulumScene = {
  name: 'Pendulum',
  maxAngle: Math.PI / 4,
  lengthRatio: 0.55, // pendulum length as fraction of canvas height

  setup(voices, w, h) {
    // No persistent state needed
  },

  draw(p, voices, w, h, options = {}) {
    // Semi-transparent background for motion trails
    p.fill(10, 10, 15, 22);
    p.noStroke();
    p.rect(0, 0, w, h);

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
      const cy = startY + i * spacing;

      // ── Calculate Normalized Position with Cycle Sync ──
      // Default: Sync center crossing (0) with Trigger (phase 0/1)
      // Visual Period = 2 * Audio Period
      // TotalPhase = elapsedBeats * ratio
      
      const totalPhase = (options.elapsedBeats || 0) * voice.ratio;
      let normPos = 0;

      if (easing === 'linear') {
        // Triangle over 2 cycles: 0 -> 1 -> 0 -> -1 -> 0
        // Input: totalPhase (0..1..2)
        // p2 = totalPhase % 2.
        const p2 = totalPhase % 2;
        if (p2 < 0.5) normPos = p2 * 2;         // 0 -> 1
        else if (p2 < 1.0) normPos = 2 - p2 * 2; // 1 -> 0
        else if (p2 < 1.5) normPos = -(p2 - 1) * 2; // 0 -> -1
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
        else if (p2 < 1.5) normPos = 2 - (p2 * 2); 
        else normPos = (p2 * 2) - 4;
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

      const bobX = cx + Math.sin(angle) * L;
      const bobY = cy - L * (1 - Math.cos(angle));

      const visualY = bobY;

      const [hue, sat, bri] = voice.color;

      // ── String / Connector ──
      p.push();
      p.colorMode(p.HSB, 360, 100, 100, 100);
      p.stroke(hue, sat * 0.4, bri * 0.3, 30);
      p.strokeWeight(1.5);
      p.line(cx, cy, bobX, visualY);
      p.pop();

      // ── Glow layers ──
      p.push();
      p.colorMode(p.HSB, 360, 100, 100, 100);
      p.noStroke();

      const baseRadius = Math.min(w, h) * 0.015;
      const pulseRadius = baseRadius + voice.amplitude * baseRadius * 1.8;

      // Outer glow
      p.fill(hue, sat * 0.6, bri, 4 + voice.amplitude * 15);
      p.ellipse(bobX, visualY, pulseRadius * 5, pulseRadius * 5);

      // Core bob
      p.fill(hue, sat * 0.5, bri, 60 + voice.amplitude * 40);
      p.ellipse(bobX, visualY, pulseRadius, pulseRadius);

      p.pop();

      // ── Trigger Flash on Center Line ──
      if (voice.triggered) { 
        p.push();
        p.colorMode(p.HSB, 360, 100, 100, 100);
        
        // Flash on center line
        p.noStroke();
        p.fill(hue, sat * 0.2, 100, 60 * voice.amplitude);
        p.ellipse(cx, cy, pulseRadius * 3, pulseRadius * 0.5); 
        p.ellipse(cx, cy, pulseRadius * 0.5, pulseRadius * 3); 

        // Ring ripple at bob
        p.noFill();
        p.stroke(hue, sat * 0.5, 100, 60);
        p.strokeWeight(2);
        p.ellipse(bobX, visualY, pulseRadius * 3, pulseRadius * 3);
        
        p.pop();
      }
    }
  },

  teardown() {},
};
