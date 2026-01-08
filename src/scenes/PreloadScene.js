window.PreloadScene = class PreloadScene extends Phaser.Scene {
  constructor() { super("PreloadScene"); }

  preload() {
    // Backgrounds
    this.load.image("bg_layer1", "./assets/bg/layer1.png");
    this.load.image("bg_layer2", "./assets/bg/layer2.png");
    this.load.image("bg_3", "./assets/bg/3.png");
    this.load.image("bg_4", "./assets/bg/4.png");

    this.load.image("ground", "./assets/ground.png");

    // 🔥 CORRECT sprite-sheet slicing (800x700, 4x4)
    this.load.spritesheet("player_run", "./assets/player/run.png", {
      frameWidth: 200,
      frameHeight: 175
    });
  }

  create() {
    if (!this.anims.exists("run")) {
      this.anims.create({
        key: "run",
        frames: this.anims.generateFrameNumbers("player_run", {
          start: 0,
          end: 15   // 16 frames (0–15)
        }),
        frameRate: 12,
        repeat: -1
      });
    }

    this.scene.start("MenuScene");
  }
};
