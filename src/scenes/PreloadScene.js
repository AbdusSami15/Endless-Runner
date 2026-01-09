window.PreloadScene = class PreloadScene extends Phaser.Scene {
  constructor() {
    super("PreloadScene");
  }

  preload() {
    // Backgrounds
    this.load.image("bg_layer1", "./assets/bg/layer1.png");
    this.load.image("bg_layer2", "./assets/bg/layer2.png");
    this.load.image("bg_3", "./assets/bg/3.png");
    this.load.image("bg_4", "./assets/bg/4.png");

    // Ground
    this.load.image("ground", "./assets/ground.png");

    // Obstacles
    this.load.image("obs_bird", "./assets/obstacles/bird.png");
    this.load.image("obs_spike", "./assets/obstacles/spike.png");

    // Player run frames (assets/player/run/1.png ... 16.png)
    for (let i = 1; i <= 16; i++) {
      this.load.image(`run${i}`, `./assets/player/run/${i}.png`);
    }
  }

  create() {
    // RUN animation (6..11)
    if (!this.anims.exists("player_run")) {
      this.anims.create({
        key: "player_run",
        frames: [
          { key: "run6" },
          { key: "run7" },
          { key: "run8" },
          { key: "run9" },
          { key: "run10" },
          { key: "run11" }
        ],
        frameRate: 12,
        repeat: -1
      });
    }

    // JUMP animation (12..14)
    if (!this.anims.exists("player_jump")) {
      this.anims.create({
        key: "player_jump",
        frames: [{ key: "run12" }, { key: "run13" }, { key: "run14" }],
        frameRate: 10,
        repeat: 0
      });
    }

    this.scene.start("MenuScene");
  }
};
