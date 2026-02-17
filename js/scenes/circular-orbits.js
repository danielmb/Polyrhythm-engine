/**
 * circular-orbits.js — Circular orbits scene.
 * N circles orbiting a central point at different radii and speeds.
 */

const CircularOrbitsScene = {
  name: 'Circular Orbits',
  trails: [], // ring trail history
  maxTrails: 150,

  setup(voices, w, h) {
    this.trails = [];
  },

  draw(p, voices, w, h, options = {}) {
    // Canvas is cleared and space background drawn by the renderer

    const cx = w / 2;
    const cy = h / 2;
    const n = voices.length;
    const maxRadius = Math.min(w, h) * 0.38;
    const minRadius = Math.min(w, h) * 0.1;
    const spatialScale = maxRadius * 0.35; // how far offsets push the orbit center

    // Pre-compute orbiter positions for all voices
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
      const angle = visualPhase * Math.PI * 2 - Math.PI / 2;
      positions.push({
        ox: orbitCx + r * Math.cos(angle),
        oy: orbitCy + r * Math.sin(angle),
        orbitCx,
        orbitCy,
        r,
      });
    }

    // ── Draw actual orbit paths (offset circles) ──
    p.push();
    p.colorMode(p.HSB, 360, 100, 100, 100);
    p.noFill();
    for (let i = 0; i < n; i++) {
      const { orbitCx, orbitCy, r } = positions[i];
      p.stroke(voices[i].color[0], 15, 30, 8);
      p.strokeWeight(0.8);
      p.ellipse(orbitCx, orbitCy, r * 2, r * 2);
    }
    p.pop();

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
        // Glow based on triggerGlow — fades smoothly
        const maxGlow = Math.max(
          voices[i].triggerGlow || 0,
          voices[i + 1].triggerGlow || 0,
        );
        const trigAlpha = 6 + maxGlow * 40;
        p.stroke(avgHue, 40, 80, trigAlpha);
        p.strokeWeight(0.5 + maxGlow * 1.5);
        p.line(a.ox, a.oy, b.ox, b.oy);
      }
      p.pop();
    }

    // ── Update & draw trails ──
    for (let j = this.trails.length - 1; j >= 0; j--) {
      const t = this.trails[j];
      t.life -= 0.015;
      if (t.life <= 0) {
        this.trails.splice(j, 1);
        continue;
      }
      p.push();
      p.colorMode(p.HSB, 360, 100, 100, 100);
      p.noStroke();
      p.fill(t.hue, t.sat * 0.5, t.bri, t.life * 15);
      p.ellipse(t.x, t.y, t.size * t.life, t.size * t.life);
      p.pop();
    }

    // ── Draw center glow ──
    p.push();
    p.noStroke();
    p.fill(240, 20, 50, 3);
    p.ellipse(cx, cy, minRadius * 1.5, minRadius * 1.5);
    p.fill(240, 10, 80, 5);
    p.ellipse(cx, cy, 10, 10);
    p.pop();

    // ── Draw orbiters ──
    for (let i = 0; i < n; i++) {
      const voice = voices[i];
      const { ox, oy } = positions[i];

      const [hue, sat, bri] = voice.color;
      const baseSize = Math.min(w, h) * 0.02;
      const glow = voice.triggerGlow || 0;
      const size = baseSize + voice.amplitude * baseSize * 2;

      // Leave trail
      if (this.trails.length < this.maxTrails) {
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

      // Outer glow — boosted by triggerGlow
      p.fill(hue, sat * 0.5, bri, 4 + voice.amplitude * 12 + glow * 20);
      p.ellipse(ox, oy, size * (4 + glow * 2), size * (4 + glow * 2));

      // Mid glow
      p.fill(hue, sat * 0.6, bri, 8 + voice.amplitude * 20 + glow * 15);
      p.ellipse(ox, oy, size * 2.5, size * 2.5);

      // Core — brighter with glow
      p.fill(
        hue,
        sat * (0.6 - glow * 0.3),
        bri + glow * 20,
        40 + voice.amplitude * 55 + glow * 30,
      );
      p.ellipse(ox, oy, size * (1 + glow * 0.3), size * (1 + glow * 0.3));

      // Bright center
      p.fill(hue, sat * 0.2, 100, 20 + voice.amplitude * 40 + glow * 20);
      p.ellipse(ox, oy, size * 0.35, size * 0.35);

      p.pop();

      // ── Trigger glow lines + flash (fades with triggerGlow) ──
      if (glow > 0.01) {
        // Flash ring at orbiter position
        p.push();
        p.colorMode(p.HSB, 360, 100, 100, 100);
        p.noFill();
        p.stroke(hue, sat * 0.4, 100, glow * 50);
        p.strokeWeight(1 + glow);
        p.ellipse(
          ox,
          oy,
          size * (4 + (1 - glow) * 4),
          size * (4 + (1 - glow) * 4),
        );
        p.pop();

        // Line from main center to hit point — fades out
        p.push();
        p.colorMode(p.HSB, 360, 100, 100, 100);
        p.stroke(hue, sat * 0.5, 100, glow * 40);
        p.strokeWeight(0.5 + glow * 1.5);
        p.line(cx, cy, ox, oy);
        p.pop();

        // Small flash at the main center
        p.push();
        p.colorMode(p.HSB, 360, 100, 100, 100);
        p.noStroke();
        p.fill(hue, sat * 0.3, 100, glow * 25);
        p.ellipse(cx, cy, 8 + glow * 6, 8 + glow * 6);
        p.pop();
      }
    }
  },

  teardown() {
    this.trails = [];
  },
};
