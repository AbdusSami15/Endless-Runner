class GameScene extends Phaser.Scene {
  constructor() {
    super("GameScene");

    this.worldSpeed = 700;      // base speed (px/sec)
    this.speedRamp = 0;         // increases over time
    this.score = 0;
    this.timeAlive = 0;

    this.isOver = false;
    this.spawnEvent = null;
    this.rampEvent = null;
  }

  create() {
    window.applyCoverCamera(this);

    this.isOver = false;
    this.score = 0;
    this.timeAlive = 0;
    this.speedRamp = 0;

    // Parallax layers (tileSprites) sized to base world (camera will cover-fill)
    this.bgFar = this.add.tileSprite(0, 0, window.BASE_W, window.BASE_H, "bg_far").setOrigin(0);
    this.bgNear = this.add.tileSprite(0, 0, window.BASE_W, window.BASE_H, "bg_near").setOrigin(0);

    // Ground
    const groundY = 900;
    this.ground = this.physics.add.staticSprite(window.BASE_W / 2, groundY + 60, "ground_tex");
    this.ground.setScale(window.BASE_W / 512, 1).refreshBody();

    // Player
    this.player = this.physics.add.sprite(260, groundY - 120, "player_run_1");
    this.player.setCollideWorldBounds(true);
    this.player.body.setSize(56, 78, true);
    this.player.setGravityY(2600);
    this.player.setDepth(5);

    // Run animation
    if (!this.anims.exists("run")) {
      this.anims.create({
        key: "run",
        frames: [{ key: "player_run_1" }, { key: "player_run_2" }],
        frameRate: 10,
        repeat: -1
      });
    }
    this.player.play("run");

    this.physics.add.collider(this.player, this.ground);

    // Obstacles
    this.obstacles = this.physics.add.group({ allowGravity: false, immovable: true });

    this.physics.add.collider(this.player, this.obstacles, () => this.gameOver());

    // Input
    this.input.on("pointerdown", () => this.jump());
    this.input.keyboard?.on("keydown-SPACE", () => this.jump());

    // Procedural spawn
    this.spawnEvent = this.time.addEvent({
      delay: 1200,
      loop: true,
      callback: () => this.spawnObstacle()
    });

    // Difficulty scaling after 30 seconds (then ramps)
    this.rampEvent = this.time.addEvent({
      delay: 30000,
      loop: false,
      callback: () => {
        // start ramping speed every few seconds
        this.time.addEvent({
          delay: 2500,
          loop: true,
          callback: () => {
            this.speedRamp = Math.min(900, this.speedRamp + 60);
          }
        });
        // and tighten spawn interval
        this.time.addEvent({
          delay: 4000,
          loop: true,
          callback: () => {
            if (this.spawnEvent) {
              const newDelay = Math.max(520, this.spawnEvent.delay - 60);
              this.spawnEvent.delay = newDelay;
            }
          }
        });
      }
    });

    // Listen for resize
    this.scale.on("resize", () => {
      window.applyCoverCamera(this);
      this.relayout();
    });

    this.relayout();

    // Tell UI initial state
    this.events.emit("ui", { type: "score", value: 0 });
    this.events.emit("ui", { type: "speed", value: this.getSpeed() });
  }

  relayout() {
    // Keep ground fixed in base world coordinates
    const groundY = 900;
    this.ground.setPosition(window.BASE_W / 2, groundY + 60);
    this.ground.setScale(window.BASE_W / 512, 1).refreshBody();

    // Clamp player above ground on relayout
    this.player.x = 260;
    if (this.player.y > groundY - 120) this.player.y = groundY - 120;
  }

  jump() {
    if (this.isOver) return;
    if (!this.player.body.blocked.down) return;
    this.player.setVelocityY(-980);
  }

  spawnObstacle() {
    if (this.isOver) return;

    const groundY = 900;
    const x = window.BASE_W + 120;
    const y = groundY - 70;

    // Simple pooling (reuse inactive)
    let obs = this.obstacles.getFirstDead(false);
    if (!obs) {
      obs = this.obstacles.create(x, y, "obstacle_tex");
      obs.setDepth(6);
      obs.body.setSize(56, 92, true);
    } else {
      obs.enableBody(false, x, y, true, true);
      obs.setTexture("obstacle_tex");
    }

    obs.x = x;
    obs.y = y;
    obs.passed = false;
  }

  getSpeed() {
    return this.worldSpeed + this.speedRamp;
  }

  update(time, delta) {
    if (this.isOver) return;

    const dt = delta / 1000;
    const speed = this.getSpeed();

    // Parallax scroll
    this.bgFar.tilePositionX += speed * 0.10 * dt;
    this.bgNear.tilePositionX += speed * 0.26 * dt;

    // Move obstacles left
    const children = this.obstacles.getChildren();
    for (let i = 0; i < children.length; i++) {
      const o = children[i];
      if (!o.active) continue;

      o.x -= speed * dt;

      // Score: distance-based
      // Also count passed obstacles cleanly
      if (!o.passed && o.x < this.player.x) {
        o.passed = true;
        this.score += 25; // bonus for passing
      }

      if (o.x < -140) {
        o.disableBody(true, true);
      }
    }

    this.timeAlive += dt;
    this.score += speed * dt * 0.02; // distance scoring

    // UI updates (throttled)
    if (!this._uiAccum) this._uiAccum = 0;
    this._uiAccum += delta;
    if (this._uiAccum >= 120) {
      this._uiAccum = 0;
      this.events.emit("ui", { type: "score", value: Math.floor(this.score) });
      this.events.emit("ui", { type: "speed", value: Math.floor(speed) });
      this.events.emit("ui", { type: "time", value: this.timeAlive });
    }
  }

  gameOver() {
    if (this.isOver) return;
    this.isOver = true;

    // stop spawns
    if (this.spawnEvent) this.spawnEvent.remove(false);

    // stop player
    this.player.setVelocity(0, 0);
    this.player.anims.pause();

    // freeze obstacles in place
    this.obstacles.getChildren().forEach(o => {
      if (o.active) o.body.enable = false;
    });

    // inform UI + go to GameOver
    const finalScore = Math.floor(this.score);
    this.events.emit("ui", { type: "gameover", value: finalScore });

    this.scene.stop("UIScene");
    this.scene.start("GameOverScene", { score: finalScore, time: this.timeAlive });
  }
}
