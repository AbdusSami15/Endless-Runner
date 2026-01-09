const config = {
  type: Phaser.AUTO,
  parent: "game-container",
  width: BASE_W,
  height: BASE_H,
  backgroundColor: "#000000",

  scale: {
    mode: Phaser.Scale.RESIZE,      // 🔥 key fix
    autoCenter: Phaser.Scale.CENTER_BOTH
  },

  physics: {
    default: "arcade",
    arcade: {
      gravity: { y: 0 },
      debug: false
    }
  },

  scene: [
    BootScene,
    PreloadScene,
    MenuScene,
    GameScene,
    UIScene
  ]
};

window.game = new Phaser.Game(config);
