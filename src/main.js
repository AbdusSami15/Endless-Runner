window.game = new Phaser.Game({
  type: Phaser.AUTO,
  parent: "game",
  backgroundColor: "#0b0f14",

  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
    width: BASE_W,
    height: BASE_H
  },

  physics: {
    default: "arcade",
    arcade: {
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
});
