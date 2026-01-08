// Base "designed" world size (LANDSCAPE)
window.BASE_W = 1920;
window.BASE_H = 1080;

// Global helper: cover scaling (no black bars, no stretch)
// IMPORTANT: RESIZE mode already updates canvas size, so NEVER call scene.scale.resize() here.
window.applyCoverCamera = function (scene) {
  const cam = scene.cameras.main;

  const vw = scene.scale.gameSize.width;
  const vh = scene.scale.gameSize.height;

  const zoom = Math.max(vw / window.BASE_W, vh / window.BASE_H);
  cam.setZoom(zoom);
  cam.centerOn(window.BASE_W * 0.5, window.BASE_H * 0.5);

  if (scene.physics && scene.physics.world) {
    scene.physics.world.setBounds(0, 0, window.BASE_W, window.BASE_H);
  }
};

// Safe resize binder (prevents resize spam / recursion)
window.bindSafeResize = function (scene, extraFn) {
  scene._resizeQueued = false;

  scene.scale.on("resize", () => {
    if (scene._resizeQueued) return;
    scene._resizeQueued = true;

    requestAnimationFrame(() => {
      scene._resizeQueued = false;
      window.applyCoverCamera(scene);
      if (typeof extraFn === "function") extraFn();
    });
  });
};

const config = {
  type: Phaser.AUTO,
  parent: "game",
  backgroundColor: "#000000",
  scale: {
    mode: Phaser.Scale.RESIZE, // IMPORTANT: no FIT => no letterboxing
    autoCenter: Phaser.Scale.CENTER_BOTH
  },
  render: {
    pixelArt: false,
    antialias: true,
    roundPixels: false
  },
  physics: {
    default: "arcade",
    arcade: { debug: false }
  },
  scene: [BootScene, MenuScene, GameScene, UIScene, GameOverScene]
};

new Phaser.Game(config);
