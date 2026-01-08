class EndlessRunnerScene extends Phaser.Scene {
  constructor() {
    super("EndlessRunnerScene");

    this.speed = 250;
    this.score = 0;
    this.isGameOver = false;
  }

  preload() {
    // Placeholder textures (no assets yet)
    this.createPlaceholderTextures();
  }

  create() {
    const { width, height } = this.scale;

    // Background layers (parallax placeholders)
    this.bg1 = this.add.tileSprite(0, 0, width, height, "bg1").setOrigin(0);
    this.bg2 = this.add.tileSprite(0, 0, width, height, "bg2").setOrigin(0);

    // Ground
    this.ground = this.physics.add.staticImage(width / 2, height - 80, "ground");

    // Player
    this.player = this.physics.add.sprite(150, height - 160, "player");
    this.player.setGravityY(1600);
    this.player.setCollideWorldBounds(true);

    // Collisions
    this.physics.add.collider(this.player, this.ground);

    // Input (mouse + tap)
    this.input.on("pointerdown", () => {
      if (this.isGameOver) return;
      if (this.player.body.blocked.down) {
        this.player.setVelocityY(-650);
      }
    });

    // Obstacles group
    this.obstacles = this.physics.add.group();

    // Collision with obstacles
    this.physics.add.collider(this.player, this.obstacles, () => {
      this.gameOver();
    });

    // Score UI
    this.scoreText = this.add.text(20, 20, "Score: 0", {
      fontSize: "24px",
      color: "#ffffff"
    });

    // Spawn obstacles
    this.spawnTimer = this.time.addEvent({
      delay: 1400,
      loop: true,
      callback: this.spawnObstacle,
      callbackScope: this
    });
  }

  update(time, delta) {
    if (this.isGameOver) return;

    // Parallax scrolling
    this.bg1.tilePositionX += this.speed * 0.2 * delta / 1000;
    this.bg2.tilePositionX += this.speed * 0.5 * delta / 1000;

    // Move obstacles
    this.obstacles.getChildren().forEach(obs => {
      obs.x -= this.speed * delta / 1000;
      if (obs.x < -100) obs.destroy();
    });

    // Score (distance based)
    this.score += delta * 0.01;
    this.scoreText.setText("Score: " + Math.floor(this.score));
  }

  spawnObstacle() {
    const { width, height } = this.scale;

    const obstacle = this.obstacles.create(
      width + 80,
      height - 140,
      "obstacle"
    );

    obstacle.setImmovable(true);
    obstacle.body.allowGravity = false;
  }

  gameOver() {
    this.isGameOver = true;
    this.spawnTimer.remove(false);

    this.add.rectangle(
      this.scale.width / 2,
      this.scale.height / 2,
      this.scale.width,
      this.scale.height,
      0x000000,
      0.6
    );

    this.add.text(
      this.scale.width / 2,
      this.scale.height / 2,
      "GAME OVER\nTap to Restart",
      { fontSize: "36px", color: "#ffffff", align: "center" }
    ).setOrigin(0.5);

    this.input.once("pointerdown", () => {
      this.scene.restart();
    });
  }

  createPlaceholderTextures() {
    // Background layer 1
    let g = this.make.graphics({ add: false });
    g.fillStyle(0x1f2933);
    g.fillRect(0, 0, 64, 64);
    g.generateTexture("bg1", 64, 64);
    g.clear();

    // Background layer 2
    g.fillStyle(0x111827);
    g.fillRect(0, 0, 64, 64);
    g.generateTexture("bg2", 64, 64);
    g.clear();

    // Player
    g.fillStyle(0x4cc9f0);
    g.fillRect(0, 0, 50, 80);
    g.generateTexture("player", 50, 80);
    g.clear();

    // Ground
    g.fillStyle(0x2d6a4f);
    g.fillRect(0, 0, 800, 40);
    g.generateTexture("ground", 800, 40);
    g.clear();

    // Obstacle
    g.fillStyle(0xe63946);
    g.fillRect(0, 0, 40, 60);
    g.generateTexture("obstacle", 40, 60);
    g.destroy();
  }
}

// Phaser Config
const config = {
  type: Phaser.AUTO,
  parent: "game",
  width: 720,
  height: 1280,
  physics: {
    default: "arcade",
    arcade: {
      debug: false
    }
  },
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH
  },
  scene: [EndlessRunnerScene]
};

new Phaser.Game(config);
