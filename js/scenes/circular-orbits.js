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

  draw(p, voices, w, h) {
    // Semi-transparent background for motion trails
    p.fill(10, 10, 15, 20);
    p.noStroke();
    p.rect(0, 0, w, h);

    const cx = w / 2;
    const cy = h / 2;
    const n = voices.length;
    const maxRadius = Math.min(w, h) * 0.38;
    const minRadius = Math.min(w, h) * 0.1;
    const spatialScale = maxRadius * 0.35; // how far offsets push the orbit center

    // ── Draw actual orbit paths (offset circles) ──
    p.push();
    p.colorMode(p.HSB, 360, 100, 100, 100);
    p.noFill();
    for (let i = 0; i < n; i++) {
      const voice = voices[i];
      const r = minRadius + (maxRadius - minRadius) * (i / Math.max(n - 1, 1));
      const ofsX =
        (voice.spatialOffset ? voice.spatialOffset.x : 0) * spatialScale;
      const ofsY =
        (voice.spatialOffset ? voice.spatialOffset.y : 0) * spatialScale;
      const orbitCx = cx + ofsX;
      const orbitCy = cy + ofsY;

      p.stroke(voice.color[0], 15, 30, 8);
      p.strokeWeight(0.8);
      p.ellipse(orbitCx, orbitCy, r * 2, r * 2);
    }
    p.pop();

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
      const r = minRadius + (maxRadius - minRadius) * (i / Math.max(n - 1, 1));

      // Spatial offset — shifts this voice's orbit center
      const ofsX =
        (voice.spatialOffset ? voice.spatialOffset.x : 0) * spatialScale;
      const ofsY =
        (voice.spatialOffset ? voice.spatialOffset.y : 0) * spatialScale;
      const orbitCx = cx + ofsX;
      const orbitCy = cy + ofsY;

      // Phase offset — shifts starting position on the orbit
      const visualPhase = (voice.phase + (voice.visualPhaseOffset || 0)) % 1;

      // Angle from visual phase (0 = top, clockwise)
      const angle = visualPhase * Math.PI * 2 - Math.PI / 2;
      const ox = orbitCx + r * Math.cos(angle);
      const oy = orbitCy + r * Math.sin(angle);

      const [hue, sat, bri] = voice.color;
      const baseSize = Math.min(w, h) * 0.02;
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

      // Outer glow
      p.fill(hue, sat * 0.5, bri, 4 + voice.amplitude * 12);
      p.ellipse(ox, oy, size * 4, size * 4);

      // Mid glow
      p.fill(hue, sat * 0.6, bri, 8 + voice.amplitude * 20);
      p.ellipse(ox, oy, size * 2.5, size * 2.5);

      // Core
      p.fill(hue, sat * 0.6, bri, 40 + voice.amplitude * 55);
      p.ellipse(ox, oy, size, size);

      // Bright center
      p.fill(hue, sat * 0.2, 100, 20 + voice.amplitude * 40);
      p.ellipse(ox, oy, size * 0.35, size * 0.35);

      p.pop();

      // ── Trigger flash + line ──
      if (voice.triggered) {
        // Flash ring at orbiter position
        p.push();
        p.colorMode(p.HSB, 360, 100, 100, 100);
        p.noFill();
        p.stroke(hue, sat * 0.4, 100, 50);
        p.strokeWeight(2);
        p.ellipse(ox, oy, size * 4, size * 4);
        p.pop();

        // Line from main center to hit point
        p.push();
        p.colorMode(p.HSB, 360, 100, 100, 100);
        p.stroke(hue, sat * 0.5, 100, 40);
        p.strokeWeight(1.5);
        p.line(cx, cy, ox, oy);
        p.pop();

        // Small flash at the main center
        p.push();
        p.colorMode(p.HSB, 360, 100, 100, 100);
        p.noStroke();
        p.fill(hue, sat * 0.3, 100, 25);
        p.ellipse(cx, cy, 12, 12);
        p.pop();
      }
    }
  },

  teardown() {
    this.trails = [];
  },
};
