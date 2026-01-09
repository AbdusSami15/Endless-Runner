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

    this.bgLayers = [];

    // Obstacle tuning
    this.obstacleDefs = {
      obs_spike: { type: "ground", scale: 1, body: { w: 90, h: 70 } },
      obs_bird: { type: "air", scale: 1, body: { w: 80, h: 60 } }
    };
  }

  create() {
    this.applyCoverCamera();
    this.physics.world.setBounds(0, 0, BASE_W, BASE_H);

    // Ground (bottom anchored)
    const groundImg = this.textures.get("ground").getSourceImage();
    const groundScaleX = BASE_W / groundImg.width;
    const groundScaleY = SETTINGS.groundHeight / groundImg.height;

    this.ground = this.physics.add.staticImage(BASE_W / 2, BASE_H, "ground");
    this.ground.setOrigin(0.5, 1);
    this.ground.setScale(groundScaleX, groundScaleY).refreshBody();
    this.groundTopY = this.ground.getTopCenter().y;

    // Background
    this.addBackground();

    // Player
    this.player = this.physics.add.sprite(150, this.groundTopY, "run6");
    this.player.setOrigin(0.5, 1);
    this.player.setScale(1);
    this.player.setDepth(20);

    // Hitbox (tweak if needed)
    this.player.body.setSize(80, 120, true);
    this.player.body.setOffset((this.player.width - 80) * 0.5, (this.player.height - 120) * 0.5);

    this.player.setGravityY(SETTINGS.gravityY);
    this.player.setCollideWorldBounds(true);

    if (this.anims.exists("player_run")) this.player.play("player_run");

    this.physics.add.collider(this.player, this.ground);

    // Obstacles group
    this.obstacles = this.physics.add.group({ allowGravity: false });
    this.physics.add.overlap(this.player, this.obstacles, () => {
      if (!this.isGameOver) this.gameOver();
    });

    // Input: jump + jump animation
    this.input.on("pointerdown", () => {
      if (this.isGameOver) return;

      this.jumpBufferedAt = this.time.now;

      const wasGrounded = this.player.body.blocked.down;
      this.tryConsumeJumpBuffer(true);

      if (wasGrounded && this.anims.exists("player_jump")) {
        this.player.play("player_jump", true);
      }
    });

    // Optional jump cut
    this.input.on("pointerup", () => {
      if (!this.player?.body) return;
      if (this.player.body.velocity.y < 0) {
        this.player.setVelocityY(this.player.body.velocity.y * SETTINGS.jumpCutMultiplier);
      }
    });

    this.scale.on("resize", () => this.applyCoverCamera());

    // Spawn init
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

    const dt = Math.min(delta / 1000, 0.05);
    this.aliveMs += delta;

    // Parallax scroll
    for (let i = 0; i < this.bgLayers.length; i++) {
      const l = this.bgLayers[i];
      l.tilePositionX += this.speed * l._parallaxMul * dt;
    }

    // Grounded tracking
    if (this.player.body.blocked.down) this.lastGroundedAt = this.time.now;

    // Land -> back to run
    if (this.player.body.blocked.down) {
      if (this.player.anims.currentAnim?.key !== "player_run" && this.anims.exists("player_run")) {
        this.player.play("player_run", true);
      }
    }

    // Move obstacles
    const obs = this.obstacles.getChildren();
    for (let i = obs.length - 1; i >= 0; i--) {
      const o = obs[i];
      o.x -= this.speed * dt;
      if (o.x < -250) this.recycleObstacle(o);
    }

    // Spawn by distance
    this._distAcc += this.speed * dt;
    if (this._distAcc >= this._gapTarget) {
      this._distAcc = 0;
      this._gapTarget = this.pickGapPx();
      this.spawnObstacle();
    }

    // Score + speed ramp
    this.score += this.speed * dt * 0.02;
    this.events.emit("score", Math.floor(this.score));

    let ramp = SETTINGS.speedRampPerSec;
    if (this.aliveMs >= SETTINGS.extraRampAfterSec * 1000) ramp += SETTINGS.extraRampBonus;

    this.speed = clamp(this.speed + ramp * dt, SETTINGS.startSpeed, SETTINGS.maxSpeed);
    this.events.emit("speed", this.speed);
  }

  // ---------- Jump ----------
  tryConsumeJumpBuffer() {
    const now = this.time.now;
    const buffered = (now - this.jumpBufferedAt) <= SETTINGS.jumpBufferMs;
    if (!buffered) return false;

    const coyoteOk = (now - this.lastGroundedAt) <= SETTINGS.coyoteMs;
    if (this.player.body.blocked.down || coyoteOk) {
      this.jumpBufferedAt = -99999;
      this.player.setVelocityY(SETTINGS.jumpVelocity);
      return true;
    }
    return false;
  }

  // ---------- Obstacles ----------
  spawnObstacle() {
    const tex = this.pickObstacleTextureKey();
    const o = this.getObstacleFromPool(tex);

    o.setActive(true).setVisible(true);
    o.setDepth(15);
    o.body.allowGravity = false;
    o.setImmovable(true);

    const def = this.obstacleDefs[tex] || { type: "ground", scale: 1, body: { w: 80, h: 60 } };
    o.setScale(def.scale);

    if (def.type === "air") {
      const minY = this.groundTopY - 220;
      const maxY = this.groundTopY - 120;
      const y = Phaser.Math.Clamp(Phaser.Math.Between(minY, maxY), 40, this.groundTopY - 80);
      o.setOrigin(0.5, 0.8);
      o.setPosition(BASE_W + SETTINGS.obstacleXPad, y);
    } else {
      o.setOrigin(0.5, 1);
      o.setPosition(BASE_W + SETTINGS.obstacleXPad, this.groundTopY);
    }

    const bw = def.body.w;
    const bh = def.body.h;
    o.body.setSize(bw, bh, true);
    o.body.setOffset((o.width - bw) * 0.5, (o.height - bh) * 0.5);

    if (!o._addedToGroup) {
      this.obstacles.add(o);
      o._addedToGroup = true;
    }
  }

  pickObstacleTextureKey() {
    const options = [];
    if (this.textures.exists("obs_spike")) options.push("obs_spike");
    if (this.textures.exists("obs_bird")) options.push("obs_bird");
    return options.length ? options[Math.floor(Math.random() * options.length)] : "obs_spike";
  }

  getObstacleFromPool(textureKey) {
    if (this.obstaclePool.length > 0) {
      const o = this.obstaclePool.pop();
      if (o.texture.key !== textureKey) o.setTexture(textureKey);
      return o;
    }

    const o = this.physics.add.sprite(-9999, -9999, textureKey);
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

  // ---------- Background ----------
  addBackground() {
    const skyKey = this.pickTex(["layer1", "bg_layer1", "bg1", "bg_layer_1"]);
    if (skyKey) {
      this.bgSky = this.add.image(0, 0, skyKey).setOrigin(0).setScrollFactor(0).setDepth(-100);
      this.bgSky.displayWidth = BASE_W;
      this.bgSky.displayHeight = BASE_H;
    }

    const cloudsKey = this.pickTex(["layer2", "bg_layer2", "bg_2"]);
    if (cloudsKey) {
      this.addParallaxStrip({
        key: cloudsKey,
        speedMul: 0.12,
        depth: -90,
        anchorY: Math.floor(BASE_H * 0.55),
        scaleMode: "width"
      });
    }

    const farKey = this.pickTex(["4", "bg_4", "bg4", "far"]);
    if (farKey) {
      this.addParallaxStrip({
        key: farKey,
        speedMul: 0.30,
        depth: -80,
        anchorY: this.groundTopY + 2,
        scaleMode: "width"
      });
    }

    const nearKey = this.pickTex(["3", "bg_3", "bg3", "near"]);
    if (nearKey) {
      this.addParallaxStrip({
        key: nearKey,
        speedMul: 0.55,
        depth: -70,
        anchorY: this.groundTopY + 2,
        scaleMode: "width"
      });
    }
  }

  pickTex(keys) {
    for (let i = 0; i < keys.length; i++) {
      if (this.textures.exists(keys[i])) return keys[i];
    }
    return null;
  }

  addParallaxStrip({ key, speedMul, depth, anchorY, scaleMode }) {
    const img = this.textures.get(key).getSourceImage();
    const texW = img.width;
    const texH = img.height;

    const scale = scaleMode === "width" ? (BASE_W / texW) : (BASE_H / texH);
    const layerH = texH * scale;

    const ts = this.add
      .tileSprite(0, anchorY, BASE_W, layerH, key)
      .setOrigin(0, 1)
      .setScrollFactor(0)
      .setDepth(depth);

    ts.setTileScale(scale, scale);
    ts.tilePositionY = 0;
    ts._parallaxMul = speedMul;

    this.bgLayers.push(ts);
    return ts;
  }

  // ---------- Game Over ----------
  gameOver() {
    this.isGameOver = true;

    this.player.setVelocity(0, 0);
    this.player.body.enable = false;

    const scoreInt = Math.floor(this.score);
    const prevHS = loadHighScore();
    const highScore = Math.max(prevHS, scoreInt);
    if (highScore !== prevHS) saveHighScore(highScore);

    this.events.emit("best", highScore);
    this.events.emit("gameover", { score: scoreInt, highScore });
  }

  // ---------- Camera ----------
  applyCoverCamera() {
    const cam = this.cameras.main;
    const vw = this.scale.gameSize.width;
    const vh = this.scale.gameSize.height;
    const zoom = Math.max(vw / BASE_W, vh / BASE_H);
    cam.setZoom(zoom);
    cam.centerOn(BASE_W / 2, BASE_H / 2);
  }

  pickGapPx() {
    return randRange(SETTINGS.minGapPx, SETTINGS.maxGapPx);
  }
};
