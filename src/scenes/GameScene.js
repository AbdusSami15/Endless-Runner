window.GameScene = class GameScene extends Phaser.Scene {
  constructor() {
    super("GameScene");

    this.speed = SETTINGS.startSpeed;
    this.score = 0;
    this.isGameOver = false;

    this.lastGroundedAt = 0;
    this.jumpBufferedAt = -99999;
    this.aliveMs = 0;

    this.obstaclePool = [];
    this._distAcc = 0;
    this._gapTarget = 0;

    this._didFirstJump = false;
    this._jumpHeld = false;
    this._jumpHoldUntil = 0;
  }

  create() {
    this.applyContainCamera();
    this.physics.world.setBounds(0, 0, BASE_W, BASE_H);

    // ✅ Parallax (NO vertical tiling bands now)
    this.bgLayers = [];
    this.addParallaxLayer("bg_layer1", 0.10);
    this.addParallaxLayer("bg_layer2", 0.18);
    this.addParallaxLayer("bg_4", 0.35);
    this.addParallaxLayer("bg_3", 0.55);

    // Ground
    const groundY = BASE_H - SETTINGS.groundHeight;
    this.ground = this.physics.add.staticImage(BASE_W / 2, groundY, "ground");
    this.ground.setOrigin(0.5, 0.5);
    this.ground.setScale(BASE_W / this.ground.width, 1).refreshBody();
    this.groundTopY = this.ground.getTopCenter().y;

    // Player
    const key = this.textures.exists("player_run") ? "player_run" : "player";
    this.player = this.physics.add.sprite(150, this.groundTopY, key);
    this.player.setOrigin(0.5, 1);
    this.player.setDepth(20);

    if (key === "player_run") this.player.setScale(0.55);

    // hitbox (tune later)
    this.player.body.setSize(90, 120, true);
    this.player.body.setOffset(55, 45);

    this.player.setGravityY(SETTINGS.gravityY);
    this.player.setCollideWorldBounds(true);

    if (key === "player_run" && this.anims.exists("run")) this.player.play("run");

    this.physics.add.collider(this.player, this.ground);

    // Obstacles
    this.obstacles = this.physics.add.group();
    this.physics.add.overlap(this.player, this.obstacles, () => {
      if (!this.isGameOver) this.gameOver();
    });

    // Input
    this.input.on("pointerdown", () => {
      if (this.isGameOver) return;

      if (!this._didFirstJump) {
        this._didFirstJump = true;
        this.events.emit("firstJump");
      }

      this._jumpHeld = true;
      this.jumpBufferedAt = this.time.now;
      this.tryConsumeJumpBuffer(true);
    });

    this.input.on("pointerup", () => {
      this._jumpHeld = false;
      if (!this.player?.body) return;
      if (this.player.body.velocity.y < 0) {
        this.player.setVelocityY(this.player.body.velocity.y * SETTINGS.jumpCutMultiplier);
      }
    });

    this.scale.on("resize", () => this.applyContainCamera());

    // Spawn init (distance-based)
    this._distAcc = 0;
    this._gapTarget = this.pickGapPx();
    this.spawnObstacle();

    // HUD
    this.events.emit("score", 0);
    this.events.emit("speed", this.speed);
    this.events.emit("best", loadHighScore());
  }

  update(_, delta) {
    if (this.isGameOver) return;

    const dt = delta / 1000;
    this.aliveMs += delta;

    // Parallax scroll (horizontal only)
    for (let i = 0; i < this.bgLayers.length; i++) {
      const l = this.bgLayers[i];
      l.tilePositionX += this.speed * l._parallaxMul * dt;
    }

    // grounded tracking
    if (this.player.body.blocked.down) this.lastGroundedAt = this.time.now;

    // buffered jump
    this.tryConsumeJumpBuffer(false);

    // move obstacles
    const obs = this.obstacles.getChildren();
    for (let i = obs.length - 1; i >= 0; i--) {
      const o = obs[i];
      o.x -= this.speed * dt;
      if (o.x < -200) this.recycleObstacle(o);
    }

    // distance gap spawn
    this._distAcc += this.speed * dt;
    if (this._distAcc >= this._gapTarget) {
      this._distAcc = 0;
      this._gapTarget = this.pickGapPx();
      this.spawnObstacle();
    }

    // score
    this.score += this.speed * dt * 0.02;
    this.events.emit("score", Math.floor(this.score));

    // speed ramp
    let ramp = SETTINGS.speedRampPerSec;
    if (this.aliveMs >= SETTINGS.extraRampAfterSec * 1000) ramp += SETTINGS.extraRampBonus;
    this.speed = clamp(this.speed + ramp * dt, SETTINGS.startSpeed, SETTINGS.maxSpeed);
    this.events.emit("speed", this.speed);
  }

  tryConsumeJumpBuffer(fromPointerDown) {
    const now = this.time.now;
    const buffered = (now - this.jumpBufferedAt) <= SETTINGS.jumpBufferMs;
    if (!buffered) return false;

    const coyoteOk = (now - this.lastGroundedAt) <= SETTINGS.coyoteMs;

    if (this.player.body.blocked.down || coyoteOk) {
      this.jumpBufferedAt = -99999;
      this.player.setVelocityY(SETTINGS.jumpVelocity);

      if (fromPointerDown) this._jumpHoldUntil = now + SETTINGS.jumpHoldMs;
      return true;
    }

    // variable jump hold
    if (this._jumpHeld && now <= this._jumpHoldUntil && this.player.body.velocity.y < 0) {
      this.player.setVelocityY(this.player.body.velocity.y + SETTINGS.jumpHoldForce * (1 / 60));
    }

    return false;
  }

  pickGapPx() {
    return randRange(SETTINGS.minGapPx, SETTINGS.maxGapPx);
  }

  spawnObstacle() {
    const tex = this.pickObstacleTextureKey();
    const o = this.getObstacleFromPool(tex);

    const x = BASE_W + SETTINGS.obstacleXPad;
    const y = this.groundTopY;

    o.setPosition(x, y);
    o.setActive(true);
    o.setVisible(true);
    o.setDepth(15);

    o.body.allowGravity = false;
    o.body.immovable = true;

    if (!o._addedToGroup) {
      this.obstacles.add(o);
      o._addedToGroup = true;
    }
  }

  pickObstacleTextureKey() {
    const options = [];
    if (this.textures.exists("obs_rock")) options.push("obs_rock");
    if (this.textures.exists("obs_spike")) options.push("obs_spike");
    if (this.textures.exists("obs_bird")) options.push("obs_bird");
    return options.length ? options[Math.floor(Math.random() * options.length)] : "obstacle";
  }

  getObstacleFromPool(textureKey) {
    if (this.obstaclePool.length > 0) {
      const o = this.obstaclePool.pop();
      if (o.texture.key !== textureKey) o.setTexture(textureKey);
      return o;
    }

    const o = this.physics.add.sprite(-9999, -9999, textureKey);
    o.setOrigin(0.5, 1);
    o.setImmovable(true);
    o.body.allowGravity = false;
    o._addedToGroup = false;
    return o;
  }

  recycleObstacle(o) {
    o.setActive(false);
    o.setVisible(false);
    o.setPosition(-9999, -9999);
    this.obstaclePool.push(o);
  }

  gameOver() {
    this.isGameOver = true;

    this.player.setVelocity(0, 0);
    this.player.body.enable = false;

    const scoreInt = Math.floor(this.score);
    const prevHS = loadHighScore();
    const highScore = Math.max(prevHS, scoreInt);
    if (highScore !== prevHS) saveHighScore(highScore);

    this.events.emit("gameover", { score: scoreInt, highScore });
  }

  // ✅ KEY FIX: fit height using setTileScale (prevents vertical repeat bands)
  addParallaxLayer(textureKey, speedMul) {
    const key = this.textures.exists(textureKey) ? textureKey : "bg_layer1";

    const ts = this.add.tileSprite(0, 0, BASE_W, BASE_H, key).setOrigin(0);
    ts.setScrollFactor(0);

    const img = this.textures.get(key).getSourceImage();
    const scale = BASE_H / img.height; // fit height exactly
    ts.setTileScale(scale, scale);     // scale the tile, not the object

    ts.tilePositionY = 0;

    ts._parallaxMul = speedMul;
    this.bgLayers.push(ts);
    return ts;
  }

  applyContainCamera() {
    const cam = this.cameras.main;
    const vw = this.scale.gameSize.width;
    const vh = this.scale.gameSize.height;
    const zoom = Math.min(vw / BASE_W, vh / BASE_H);
    cam.setZoom(zoom);
    cam.centerOn(BASE_W / 2, BASE_H / 2);
  }
};
