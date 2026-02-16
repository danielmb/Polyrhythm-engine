/**
 * renderer.js — p5.js wrapper and scene manager.
 * Manages the p5 canvas and delegates drawing to the active scene.
 */

class Renderer {
  constructor() {
    this.scenes = {
      pendulum: PendulumScene,
      'bouncing-boxes': BouncingBoxesScene,
      'circular-orbits': CircularOrbitsScene,
    };
    this.currentScene = null;
    this.currentSceneKey = null;
    this.p = null; // p5 instance reference, set from main.js
  }

  /**
   * Set the active scene by key.
   */
  setScene(key, voices, w, h) {
    if (this.currentScene && this.currentScene.teardown) {
      this.currentScene.teardown();
    }
    this.currentSceneKey = key;
    this.currentScene = this.scenes[key] || PendulumScene;
    if (this.currentScene.setup) {
      this.currentScene.setup(voices, w, h);
    }
  }

  /**
   * Draw the current scene. Called every frame from p5's draw().
   */
  draw(p, voices, w, h, options) {
    // Clear canvas and draw space background behind the scene
    p.background(10, 10, 15);
    SpaceBackground.draw(p, w, h);

    if (this.currentScene && this.currentScene.draw) {
      this.currentScene.draw(p, voices, w, h, options);
    }
  }

  /**
   * Notify background of a canvas resize.
   */
  onResize(w, h) {
    SpaceBackground.reset();
  }

  /**
   * Get list of scene names for UI.
   */
  getSceneList() {
    return Object.entries(this.scenes).map(([key, scene]) => ({
      key,
      name: scene.name,
    }));
  }
}
