/**
 * pendulum.js — Pendulum scene.
 * N pendulums swinging at voice-specific rates with glow and trails.
 */

const PendulumScene = {
  name: 'Pendulum',
  maxAngle: Math.PI / 4,
  lengthRatio: 0.55,
  trails: [],
  maxTrails: 200,

  setup(voices, w, h) {
    this.trails = [];
  },

  draw(p, voices, w, h, options = {}) {
    // ── Visual settings ──
    const vis = options.vis || {};
    const noteSize = vis.noteSize != null ? vis.noteSize : 1.0;
    const glowInt = vis.glowIntensity != null ? vis.glowIntensity : 1.0;
    const flashInt = vis.flashIntensity != null ? vis.flashIntensity : 1.0;
    const trailLen = vis.trailLength != null ? vis.trailLength : 1.0;
    const trailOp = vis.trailOpacity != null ? vis.trailOpacity : 1.0;
    const lineOp = vis.lineOpacity != null ? vis.lineOpacity : 1.0;
    const lineThk = vis.lineThickness != null ? vis.lineThickness : 1.0;
    const satMul = vis.colorSaturation != null ? vis.colorSaturation : 1.0;
    const briMul = vis.colorBrightness != null ? vis.colorBrightness : 1.0;
    const mono = vis.monochrome || false;
    const showTrails = vis.showTrails !== false;
    const showTriggers = vis.showTriggers !== false;
    const style = vis.noteStyle || 'glow';

    const cHue = (h) => (mono ? 0 : h);
    const cSat = (s) => (mono ? 0 : Math.min(100, s * satMul));
    const cBri = (b) => Math.min(100, b * briMul);

    // ── Draw & age trail history ──
    const maxTrailCount = Math.floor(this.maxTrails * trailLen);
    for (let j = this.trails.length - 1; j >= 0; j--) {
      const t = this.trails[j];
      t.life -= 0.018 / Math.max(trailLen, 0.1);
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
        t.life * 18 * trailOp,
      );
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
    p.stroke(255, 255, 255, 8 * lineOp);
    p.strokeWeight(1 * lineThk);
    p.line(cx, marginY - 20, cx, h - marginY + 20);
    p.pop();

    // Pre-compute positions for neighbor connections
    const bobPositions = [];

    for (let i = 0; i < n; i++) {
      const voice = voices[i];
      const baseY = startY + i * spacing;

      const ofsX = (voice.spatialOffset ? voice.spatialOffset.x : 0) * w * 0.2;
      const ofsY = (voice.spatialOffset ? voice.spatialOffset.y : 0) * h * 0.15;
      const cy = baseY + ofsY;
      const anchorX = cx + ofsX;

      const totalPhase =
        (options.elapsedBeats || 0) * voice.ratio +
        (voice.visualPhaseOffset || 0);
      let normPos = 0;

      if (easing === 'linear') {
        const p2 = totalPhase % 2;
        if (p2 < 0.5) normPos = p2 * 2;
        else if (p2 < 1.5) normPos = 2 - p2 * 2;
        else normPos = p2 * 2 - 4;
      } else if (easing === 'bounce') {
        normPos = Math.abs(Math.sin(totalPhase * Math.PI));
      } else {
        normPos = Math.sin(totalPhase * Math.PI);
      }

      const maxAngle = Math.PI * 0.55;
      const angle = normPos * maxAngle;
      const L = w * 0.4;
      const bobX = anchorX + Math.sin(angle) * L;
      const bobY = cy - L * (1 - Math.cos(angle));
      const visualY = bobY;

      bobPositions.push({ bobX, visualY, anchorX, cy });

      const [hue, sat, bri] = voice.color;
      const h0 = cHue(hue);

      const baseRadius = Math.min(w, h) * 0.015 * noteSize;
      const glow = voice.triggerGlow || 0;
      const pulseRadius = baseRadius + voice.amplitude * baseRadius * 1.8;

      // ── Store trail point ──
      if (showTrails && this.trails.length < maxTrailCount) {
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
      if (lineOp > 0) {
        p.push();
        p.colorMode(p.HSB, 360, 100, 100, 100);
        p.stroke(h0, cSat(sat * 0.4), cBri(bri * 0.3), 30 * lineOp);
        p.strokeWeight(1.5 * lineThk);
        p.line(anchorX, cy, bobX, visualY);
        p.pop();
      }

      // ── Draw bob ──
      p.push();
      p.colorMode(p.HSB, 360, 100, 100, 100);
      p.noStroke();

      if (style === 'minimal') {
        const flashBri = mono ? 100 : cBri(bri + glow * 30);
        p.fill(
          h0,
          cSat(sat * 0.1),
          flashBri,
          60 + voice.amplitude * 40 + glow * 50,
        );
        p.ellipse(bobX, visualY, pulseRadius * 1.2, pulseRadius * 1.2);
        if (glow > 0.01) {
          p.fill(h0, cSat(sat * 0.05), 100, glow * 80 * flashInt);
          p.ellipse(
            bobX,
            visualY,
            pulseRadius * (2 + glow),
            pulseRadius * (2 + glow),
          );
        }
      } else if (style === 'neon') {
        p.noFill();
        p.stroke(h0, cSat(sat * 0.8), cBri(100), 60 + glow * 40);
        p.strokeWeight(2 * noteSize);
        p.ellipse(bobX, visualY, pulseRadius * 2, pulseRadius * 2);
        if (glowInt > 0) {
          p.stroke(h0, cSat(sat * 0.5), cBri(100), (15 + glow * 40) * glowInt);
          p.strokeWeight(4 * noteSize);
          p.ellipse(bobX, visualY, pulseRadius * 3.5, pulseRadius * 3.5);
        }
        p.noStroke();
        p.fill(h0, cSat(sat * 0.3), 100, 30 + glow * 40);
        p.ellipse(bobX, visualY, pulseRadius * 0.5, pulseRadius * 0.5);
      } else if (style === 'solid') {
        p.fill(
          h0,
          cSat(sat * 0.7),
          cBri(bri),
          70 + voice.amplitude * 30 + glow * 20,
        );
        p.ellipse(bobX, visualY, pulseRadius * 1.5, pulseRadius * 1.5);
      } else if (style === 'ring') {
        p.noFill();
        p.stroke(
          h0,
          cSat(sat * 0.6),
          cBri(bri),
          50 + voice.amplitude * 40 + glow * 30,
        );
        p.strokeWeight((2 + glow * 2) * noteSize);
        p.ellipse(bobX, visualY, pulseRadius * 2, pulseRadius * 2);
      } else if (style === 'dot') {
        p.fill(h0, cSat(sat * 0.3), 100, 70 + voice.amplitude * 30 + glow * 50);
        p.ellipse(bobX, visualY, pulseRadius * 0.6, pulseRadius * 0.6);
      } else if (style === 'ghost') {
        p.fill(
          h0,
          cSat(sat * 0.3),
          cBri(bri),
          (8 + voice.amplitude * 12 + glow * 15) * glowInt,
        );
        p.ellipse(
          bobX,
          visualY,
          pulseRadius * (6 + glow * 2),
          pulseRadius * (6 + glow * 2),
        );
        p.fill(h0, cSat(sat * 0.2), 100, 10 + voice.amplitude * 15 + glow * 20);
        p.ellipse(bobX, visualY, pulseRadius * 1.5, pulseRadius * 1.5);
      } else {
        // Glow (default)
        if (glowInt > 0) {
          p.fill(
            h0,
            cSat(sat * 0.6),
            cBri(bri),
            (4 + voice.amplitude * 15 + glow * 20) * glowInt,
          );
          p.ellipse(
            bobX,
            visualY,
            pulseRadius * (5 + glow * 2),
            pulseRadius * (5 + glow * 2),
          );
        }
        p.fill(
          h0,
          cSat(sat * (0.5 - glow * 0.2)),
          cBri(bri + glow * 15),
          60 + voice.amplitude * 40 + glow * 25,
        );
        p.ellipse(
          bobX,
          visualY,
          pulseRadius * (1 + glow * 0.2),
          pulseRadius * (1 + glow * 0.2),
        );
      }

      p.pop();

      // ── Trigger Flash ──
      if (showTriggers && glow > 0.01 && flashInt > 0) {
        p.push();
        p.colorMode(p.HSB, 360, 100, 100, 100);

        // Flash cross on center trigger line
        p.noStroke();
        p.fill(h0, cSat(sat * 0.2), 100, glow * 50 * flashInt);
        p.ellipse(cx, cy, pulseRadius * 3 * glow, pulseRadius * 0.5);
        p.ellipse(cx, cy, pulseRadius * 0.5, pulseRadius * 3 * glow);

        // Line from center to bob
        p.stroke(h0, cSat(sat * 0.5), 100, glow * 40 * flashInt);
        p.strokeWeight((0.5 + glow * 1.5) * lineThk);
        p.line(cx, cy, bobX, visualY);

        // Ring ripple at bob
        p.noFill();
        p.stroke(h0, cSat(sat * 0.5), 100, glow * 60 * flashInt);
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

    // ── Draw neighbor connection lines ──
    if (options.connectNeighbors && n > 1 && lineOp > 0) {
      p.push();
      p.colorMode(p.HSB, 360, 100, 100, 100);
      for (let i = 0; i < n - 1; i++) {
        const a = bobPositions[i];
        const b = bobPositions[i + 1];
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
        p.line(a.bobX, a.visualY, b.bobX, b.visualY);
      }
      p.pop();
    }

    // ── Chord Change Flash ──
    const ccGlow = options.chordChangeGlow || 0;
    if (ccGlow > 0.01 && showTriggers && flashInt > 0) {
      p.push();
      p.colorMode(p.HSB, 360, 100, 100, 100);
      const waveW = w * (1 - ccGlow) * 0.5;
      p.noStroke();
      p.fill(cHue(220), cSat(20), 100, ccGlow * 25 * flashInt);
      p.rectMode(p.CENTER);
      p.rect(cx, h / 2, waveW, h, 0);
      p.stroke(cHue(260), cSat(20), 100, ccGlow * 50 * flashInt);
      p.strokeWeight((1.5 + ccGlow * 2) * lineThk);
      p.line(cx, marginY - 20, cx, h - marginY + 20);
      p.pop();
    }
  },

  teardown() {
    this.trails = [];
  },
};
