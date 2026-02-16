/**
 * space-background.js — Procedural starfield + nebula backdrop.
 *
 * Generates a static star field once, then draws it each frame along with
 * slowly drifting, softly colored nebula clouds for a deep-space feel.
 * Designed to be drawn *before* any scene so it sits behind everything.
 */

const SpaceBackground = (() => {
  let stars = [];
  let nebulae = [];
  let _w = 0;
  let _h = 0;
  let _initialized = false;
  let _frameCount = 0;

  /**
   * (Re-)generate stars and nebulae for the given canvas dimensions.
   */
  function init(w, h) {
    _w = w;
    _h = h;
    _frameCount = 0;

    // ── Stars ──
    // Density: ~1 star per 2500 px²  (a 1920×1080 screen ≈ 830 stars)
    const count = Math.floor((w * h) / 2500);
    stars = [];
    for (let i = 0; i < count; i++) {
      stars.push({
        x: Math.random() * w,
        y: Math.random() * h,
        r: Math.random() * 1.6 + 0.3, // radius 0.3–1.9
        baseBri: 30 + Math.random() * 55, // brightness 30–85
        twinkleSpeed: 0.3 + Math.random() * 1.5, // how fast it flickers
        twinkleOffset: Math.random() * Math.PI * 2,
        hue:
          Math.random() < 0.15
            ? 200 + Math.random() * 40 // 15 % blueish tint
            : Math.random() < 0.08
              ? 30 + Math.random() * 20 // 8 % warm tint
              : 0, // rest are white (hue irrelevant at low sat)
        sat: Math.random() < 0.2 ? 15 + Math.random() * 25 : 0,
      });
    }

    // ── Nebulae (large soft ellipses) ──
    const nebulaCount = 4 + Math.floor(Math.random() * 3); // 4-6
    nebulae = [];
    const palette = [
      { h: 260, s: 40 }, // purple
      { h: 220, s: 35 }, // deep blue
      { h: 190, s: 30 }, // teal
      { h: 300, s: 25 }, // magenta
      { h: 340, s: 20 }, // rose
      { h: 170, s: 25 }, // cyan
    ];
    for (let i = 0; i < nebulaCount; i++) {
      const c = palette[i % palette.length];
      nebulae.push({
        x: Math.random() * w,
        y: Math.random() * h,
        rx: 150 + Math.random() * 350,
        ry: 120 + Math.random() * 300,
        hue: c.h + (Math.random() - 0.5) * 20,
        sat: c.s,
        bri: 12 + Math.random() * 10,
        alpha: 3 + Math.random() * 4, // very subtle
        driftX: (Math.random() - 0.5) * 0.04,
        driftY: (Math.random() - 0.5) * 0.03,
      });
    }

    _initialized = true;
  }

  /**
   * Draw the background.  Must be called AFTER p.background() in the scene.
   * Because the scenes already clear the canvas, we draw the stars on top of
   * the cleared background each frame (they're just dots — very cheap).
   */
  function draw(p, w, h) {
    if (!_initialized || w !== _w || h !== _h) {
      init(w, h);
    }
    _frameCount++;

    p.push();
    p.colorMode(p.HSB, 360, 100, 100, 100);
    p.noStroke();

    // ── Nebulae ──
    for (const n of nebulae) {
      // Slow drift + wrap
      n.x += n.driftX;
      n.y += n.driftY;
      if (n.x < -n.rx) n.x = w + n.rx;
      if (n.x > w + n.rx) n.x = -n.rx;
      if (n.y < -n.ry) n.y = h + n.ry;
      if (n.y > h + n.ry) n.y = -n.ry;

      // Two-layer soft glow
      p.fill(n.hue, n.sat, n.bri, n.alpha * 0.5);
      p.ellipse(n.x, n.y, n.rx * 2.2, n.ry * 2.2);
      p.fill(n.hue, n.sat + 5, n.bri + 5, n.alpha);
      p.ellipse(n.x, n.y, n.rx, n.ry);
    }

    // ── Stars ──
    const time = _frameCount * 0.02;
    for (const s of stars) {
      const twinkle = Math.sin(time * s.twinkleSpeed + s.twinkleOffset);
      const bri = s.baseBri + twinkle * 15; // ±15 brightness flicker
      const alpha = 40 + twinkle * 20; // subtle alpha pulse

      p.fill(s.hue, s.sat, bri, alpha);
      p.ellipse(s.x, s.y, s.r, s.r);
    }

    p.pop();
  }

  /**
   * Force regeneration on next draw (e.g. after resize).
   */
  function reset() {
    _initialized = false;
  }

  return { init, draw, reset };
})();
