(function () {
  const config = {
    type: Phaser.AUTO,
    parent: "game",
    width: BASE_W,
    height: BASE_H,
    backgroundColor: "#0b0f14",
    physics: {
      default: "arcade",
      arcade: { debug: false }
    },
    scale: {
      mode: Phaser.Scale.FIT,
      autoCenter: Phaser.Scale.CENTER_BOTH
    },
    scene: [BootScene, PreloadScene, MenuScene, GameScene, UIScene]
  };

  new Phaser.Game(config);
})();
