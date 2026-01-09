window.GameScene = class GameScene extends Phaser.Scene {
  constructor() {
    super("GameScene");

    this.speed = SETTINGS.startSpeed;
    this.score = 0;
    this.isGameOver = false;

    this.lastGroundedAt = 0;
    this.jumpBufferedAt = -99999;
    this.aliveMs = 0;

    this.isJumping = false;

    this.obstaclePool = [];
    this._distAcc = 0;
    this._gapTarget = 0;

    this.bgLayers = [];

    this.obstacleDefs = {
      obs_enemy: { type: "ground", scale: 1, body: { w: 60, h: 80 }, groundOffset: 70 },
      obs_bird: { type: "air", scale: 1, body: { w: 80, h: 60 } }
    };

    this.gameOverUI = null;

    this.tapHint = null;
    this.tapHintBg = null;
    this.tapHintShown = true;
  }

  create() {
    this.input.removeAllListeners();
    this.tweens.killAll();

    this.applyCoverCamera();
    this.physics.world.setBounds(0, 0, BASE_W, BASE_H);

    // Ground
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
    this.player.setDepth(20);

    this.player.body.setSize(80, 120, true);
    this.player.body.setOffset((this.player.width - 80) * 0.5, (this.player.height - 120) * 0.5);

    this.player.setGravityY(SETTINGS.gravityY);
    this.player.setCollideWorldBounds(true);

    if (this.anims.exists("player_run")) this.player.play("player_run", true);

    this.physics.add.collider(this.player, this.ground);

    // Obstacles group
    this.obstacles = this.physics.add.group({ allowGravity: false });
    this.physics.add.overlap(this.player, this.obstacles, () => {
      if (!this.isGameOver) this.gameOver();
    });

    // Input priority
    this.input.topOnly = true;

    // Tap hint
    this.createTapToJumpHint();

    this.input.on("pointerdown", () => {
      if (this.isGameOver) return;

      this.hideTapToJumpHint();

      this.jumpBufferedAt = this.time.now;

      const didJump = this.tryConsumeJumpBuffer();
      if (didJump && this.anims.exists("player_jump")) {
        this.isJumping = true;
        this.player.play("player_jump", true);
      }
    });

    this.input.on("pointerup", () => {
      if (!this.player?.body) return;
      if (this.isGameOver) return;

      if (this.player.body.velocity.y < 0) {
        this.player.setVelocityY(this.player.body.velocity.y * SETTINGS.jumpCutMultiplier);
      }
    });

    this.scale.on("resize", () => {
      this.applyCoverCamera();
      this.relayoutTapHint();
    });

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

    // Parallax
    for (let i = 0; i < this.bgLayers.length; i++) {
      const l = this.bgLayers[i];
      l.tilePositionX += this.speed * l._parallaxMul * dt;
    }

    // Grounded tracking
    if (this.player.body.blocked.down) this.lastGroundedAt = this.time.now;

    // Animation state control (prevents run overriding jump)
    if (this.player.body.blocked.down) {
      if (this.isJumping) this.isJumping = false;

      if (this.anims.exists("player_run") && this.player.anims.currentAnim?.key !== "player_run") {
        this.player.play("player_run", true);
      }
    } else {
      if (this.isJumping && this.anims.exists("player_jump")) {
        if (this.player.anims.currentAnim?.key !== "player_jump") {
          this.player.play("player_jump", true);
        }
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
    const kind = this.pickObstacleTextureKey();
    const o = this.getObstacleFromPool(kind);

    o.setActive(true).setVisible(true);
    o.setDepth(15);
    o.body.allowGravity = false;
    o.setImmovable(true);

    const def = this.obstacleDefs[kind] || { type: "ground", scale: 1, body: { w: 60, h: 80 }, groundOffset: 10 };
    o.setScale(def.scale);

    // Position
    if (def.type === "air") {
      const minY = this.groundTopY - 220;
      const maxY = this.groundTopY - 120;
      const y = Phaser.Math.Clamp(Phaser.Math.Between(minY, maxY), 40, this.groundTopY - 80);
      o.setOrigin(0.5, 0.8);
      o.setPosition(BASE_W + SETTINGS.obstacleXPad, y);
    } else {
      o.setOrigin(0.5, 1);
      const groundOffset = typeof def.groundOffset === "number" ? def.groundOffset : 10;
      o.setPosition(BASE_W + SETTINGS.obstacleXPad, this.groundTopY + groundOffset);
    }

    // Body size (bottom-aligned to avoid floating)
    const bw = def.body.w;
    const bh = def.body.h;
    o.body.setSize(bw, bh, true);
    o.body.setOffset((o.width - bw) * 0.5, o.height - bh);

    // Enemy animation + face player
    if (kind === "obs_enemy" && this.anims.exists("enemy_walk")) {
      o.play("enemy_walk", true);
      o.setFlipX(true);
    } else {
      o.setFlipX(false);
    }

    if (!o._addedToGroup) {
      this.obstacles.add(o);
      o._addedToGroup = true;
    }
  }

  pickObstacleTextureKey() {
    const options = [];
    if (this.textures.exists("enemy1")) options.push("obs_enemy");
    if (this.textures.exists("obs_bird")) options.push("obs_bird");
    return options.length ? options[Math.floor(Math.random() * options.length)] : "obs_enemy";
  }

  getObstacleFromPool(kind) {
    if (this.obstaclePool.length > 0) {
      const o = this.obstaclePool.pop();
      const neededTexture = (kind === "obs_enemy") ? "enemy1" : "obs_bird";
      if (o.texture.key !== neededTexture) o.setTexture(neededTexture);
      o._kind = kind;
      return o;
    }

    const baseTexture = (kind === "obs_enemy") ? "enemy1" : "obs_bird";
    const o = this.physics.add.sprite(-9999, -9999, baseTexture);

    o.setImmovable(true);
    o.body.allowGravity = false;

    o._addedToGroup = false;
    o._kind = kind;
    return o;
  }

  recycleObstacle(o) {
    o.setActive(false);
    o.setVisible(false);
    o.anims?.stop();
    o.setFlipX(false);
    o.setPosition(-9999, -9999);
    this.obstaclePool.push(o);
  }

  // ---------- Tap Hint ----------
  createTapToJumpHint() {
    const h = 84;

    this.tapHintBg = this.add.rectangle(BASE_W / 2, BASE_H - h / 2, BASE_W, h, 0x000000, 0.35)
      .setScrollFactor(0)
      .setDepth(9000);

    this.tapHint = this.add.text(BASE_W / 2, BASE_H - h / 2, "TAP TO JUMP", {
      fontFamily: "Arial",
      fontSize: "42px",
      color: "#ffffff",
      fontStyle: "bold"
    }).setOrigin(0.5).setScrollFactor(0).setDepth(9001);

    this.tweens.add({
      targets: this.tapHint,
      alpha: { from: 1, to: 0.6 },
      duration: 500,
      yoyo: true,
      repeat: -1
    });

    this.tapHintShown = true;
  }

  relayoutTapHint() {
    if (!this.tapHintBg || !this.tapHint) return;
    const h = 84;
    this.tapHintBg.setPosition(BASE_W / 2, BASE_H - h / 2);
    this.tapHintBg.width = BASE_W;
    this.tapHint.setPosition(BASE_W / 2, BASE_H - h / 2);
  }

  hideTapToJumpHint() {
    if (!this.tapHintShown) return;
    this.tapHintShown = false;

    if (this.tapHint) this.tweens.killTweensOf(this.tapHint);

    const targets = [];
    if (this.tapHint) targets.push(this.tapHint);
    if (this.tapHintBg) targets.push(this.tapHintBg);
    if (targets.length === 0) return;

    this.tweens.add({
      targets,
      alpha: 0,
      duration: 180,
      onComplete: () => {
        if (this.tapHint) this.tapHint.destroy();
        if (this.tapHintBg) this.tapHintBg.destroy();
        this.tapHint = null;
        this.tapHintBg = null;
      }
    });
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
    if (cloudsKey) this.addParallaxStrip({ key: cloudsKey, speedMul: 0.12, depth: -90, anchorY: Math.floor(BASE_H * 0.55) });

    const farKey = this.pickTex(["4", "bg_4", "bg4", "far"]);
    if (farKey) this.addParallaxStrip({ key: farKey, speedMul: 0.30, depth: -80, anchorY: this.groundTopY + 2 });

    const nearKey = this.pickTex(["3", "bg_3", "bg3", "near"]);
    if (nearKey) this.addParallaxStrip({ key: nearKey, speedMul: 0.55, depth: -70, anchorY: this.groundTopY + 2 });
  }

  pickTex(keys) {
    for (let i = 0; i < keys.length; i++) {
      if (this.textures.exists(keys[i])) return keys[i];
    }
    return null;
  }

  addParallaxStrip({ key, speedMul, depth, anchorY }) {
    const img = this.textures.get(key).getSourceImage();
    const scale = BASE_W / img.width;
    const layerH = img.height * scale;

    const ts = this.add.tileSprite(0, anchorY, BASE_W, layerH, key)
      .setOrigin(0, 1)
      .setScrollFactor(0)
      .setDepth(depth);

    ts.setTileScale(scale, scale);
    ts._parallaxMul = speedMul;

    this.bgLayers.push(ts);
    return ts;
  }

  // ---------- Game Over ----------
  gameOver() {
    this.isGameOver = true;

    this.hideTapToJumpHint();

    this.player.setVelocity(0, 0);
    this.player.body.enable = false;

    const scoreInt = Math.floor(this.score);
    const prevHS = loadHighScore();
    const highScore = Math.max(prevHS, scoreInt);
    if (highScore !== prevHS) saveHighScore(highScore);

    this.events.emit("best", highScore);
    this.events.emit("gameover", { score: scoreInt, highScore });

    this.showGameOverUI(scoreInt, highScore);
  }

  showGameOverUI(scoreInt, highScore) {
    if (this.gameOverUI) this.gameOverUI.destroy(true);

    const layer = this.add.container(0, 0).setDepth(10000).setScrollFactor(0);

    const blocker = this.add.rectangle(BASE_W / 2, BASE_H / 2, BASE_W, BASE_H, 0x000000, 0.45)
      .setInteractive(new Phaser.Geom.Rectangle(0, 0, BASE_W, BASE_H), Phaser.Geom.Rectangle.Contains)
      .setScrollFactor(0);

    const panelW = 520;
    const panelH = 260;

    const panel = this.add.rectangle(BASE_W / 2, BASE_H / 2, panelW, panelH, 0x111827, 0.85).setScrollFactor(0);

    const title = this.add.text(BASE_W / 2, BASE_H / 2 - 90, "GAME OVER", {
      fontFamily: "Arial",
      fontSize: "44px",
      color: "#ffffff",
      fontStyle: "bold"
    }).setOrigin(0.5).setScrollFactor(0);

    const info = this.add.text(BASE_W / 2, BASE_H / 2 - 30, `Score: ${scoreInt}   Best: ${highScore}`, {
      fontFamily: "Arial",
      fontSize: "22px",
      color: "#e5e7eb"
    }).setOrigin(0.5).setScrollFactor(0);

    const btnY = BASE_H / 2 + 70;

    const restartBtn = this.makeButton(BASE_W / 2 - 130, btnY, 220, 56, "RESTART", () => {
      this.scene.restart();
    });

    const menuBtn = this.makeButton(BASE_W / 2 + 130, btnY, 220, 56, "MENU", () => {
      this.scene.start("MenuScene");
    });

    layer.add([blocker, panel, title, info, restartBtn.container, menuBtn.container]);

    this.gameOverUI = layer;
  }

  makeButton(x, y, w, h, label, onClick) {
    const container = this.add.container(x, y).setScrollFactor(0).setDepth(10001);

    const bg = this.add.rectangle(0, 0, w, h, 0x2563eb, 1)
      .setInteractive(new Phaser.Geom.Rectangle(-w / 2, -h / 2, w, h), Phaser.Geom.Rectangle.Contains);

    const txt = this.add.text(0, 0, label, {
      fontFamily: "Arial",
      fontSize: "24px",
      color: "#ffffff",
      fontStyle: "bold"
    }).setOrigin(0.5);

    bg.on("pointerdown", (p) => {
      p.event?.stopPropagation?.();
      onClick();
    });

    container.add([bg, txt]);
    return { container, bg, txt };
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
