window.PreloadScene = class PreloadScene extends Phaser.Scene {
  constructor() { super("PreloadScene"); }

  preload() {
    // 4 parallax layers
    this.load.image("bg_layer1", "./assets/bg/layer1.png");
    this.load.image("bg_layer2", "./assets/bg/layer2.png");
    this.load.image("bg_3", "./assets/bg/3.png");
    this.load.image("bg_4", "./assets/bg/4.png");

    // Obstacles
    this.load.image("obs_rock", "./assets/obstacles/rock.png");
    this.load.image("obs_spike", "./assets/obstacles/spike.png");
    this.load.image("obs_bird", "./assets/obstacles/bird.png");

    // Player run spritesheet (optional)
    this.load.spritesheet("player_run", "./assets/player/run.png", {
      frameWidth: 64,
      frameHeight: 64
    });

    // Audio
    this.load.audio("bgm", "./assets/audio/bgm.mp3");
    this.load.audio("sfx_jump", "./assets/audio/jump.mp3");
    this.load.audio("sfx_hit", "./assets/audio/hit.mp3");

    // Step 7: Tilemap (optional)
    this.load.tilemapTiledJSON("ground_map", "./assets/tilemap/ground.json");
    this.load.image("ground_tiles", "./assets/tilemap/ground_tiles.png");

    // Fallback placeholders
    this.createPlaceholderTextures();
  }

  create() {
    this.setupAnimations();
    this.scene.start("MenuScene");
  }

  setupAnimations() {
    if (this.textures.exists("player_run") && !this.anims.exists("run")) {
      this.anims.create({
        key: "run",
        frames: this.anims.generateFrameNumbers("player_run", { start: 0, end: 7 }),
        frameRate: 12,
        repeat: -1
      });
    }
  }

  createPlaceholderTextures() {
    const g = this.make.graphics({ add: false });

    if (!this.textures.exists("bg1")) {
      g.fillStyle(0x1f2933); g.fillRect(0, 0, 64, 64);
      g.generateTexture("bg1", 64, 64); g.clear();
    }

    if (!this.textures.exists("bg2")) {
      g.fillStyle(0x111827); g.fillRect(0, 0, 64, 64);
      g.generateTexture("bg2", 64, 64); g.clear();
    }

    if (!this.textures.exists("player")) {
      g.fillStyle(0x4cc9f0); g.fillRect(0, 0, 54, 86);
      g.generateTexture("player", 54, 86); g.clear();
    }

    if (!this.textures.exists("ground")) {
      g.fillStyle(0x2d6a4f); g.fillRect(0, 0, 800, 40);
      g.generateTexture("ground", 800, 40); g.clear();
    }

    if (!this.textures.exists("obstacle")) {
      g.fillStyle(0xe63946); g.fillRect(0, 0, 44, 70);
      g.generateTexture("obstacle", 44, 70);
    }

    if (!this.textures.exists("obstacle_fly")) {
      g.fillStyle(0xf59e0b); g.fillRect(0, 0, 60, 30);
      g.generateTexture("obstacle_fly", 60, 30);
    }

    // Step 7: particle texture
    if (!this.textures.exists("fx_dot")) {
      g.clear();
      g.fillStyle(0xffffff, 1);
      g.fillCircle(8, 8, 8);
      g.generateTexture("fx_dot", 16, 16);
    }

    g.destroy();
  }
};
