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

    this._pausedByVisibility = false;
    this._didFirstJump = false;

    this._bgm = null;
    this._sfxJump = null;
    this._sfxHit = null;

    this._lastSpawnWasDouble = false;

    // VFX state
    this._wasGrounded = false;
    this._dust = null;

    // Step 8 jump state
    this._jumpHeld = false;
    this._jumpHoldUntil = 0;

    // Step 8 hit state
    this._hitStopTimer = null;
  }

  create() {
    this.resetRunState();

    this.applyContainCamera();
    this.physics.world.setBounds(0, 0, BASE_W, BASE_H);

    // Parallax
    this.bgLayers = [];
    this.addParallaxLayer("bg_layer1", 0.10);
    this.addParallaxLayer("bg_layer2", 0.18);
    this.addParallaxLayer("bg_4", 0.35);
    this.addParallaxLayer("bg_3", 0.55);

    // Ground (tilemap if available else fallback)
    this.groundY = BASE_H - SETTINGS.groundHeight;
    this.groundTopY = this.groundY - (SETTINGS.groundHeight / 2);

    const usedTilemap = this.tryCreateTilemapGround();
    if (!usedTilemap) this.createFallbackGround();

    // Player
    const playerKey = this.textures.exists("player_run") ? "player_run" : "player";
    this.player = this.physics.add.sprite(150, this.groundTopY - 90, playerKey);
    if (this.anims.exists("run")) this.player.play("run");

    this.player.setGravityY(SETTINGS.gravityY);
    this.player.setCollideWorldBounds(true);

    if (this.groundLayer) this.physics.add.collider(this.player, this.groundLayer);
    else this.physics.add.collider(this.player, this.ground);

    // Obstacles
    this.obstacles = this.physics.add.group();
    this.physics.add.overlap(this.player, this.obstacles, () => {
      if (!this.isGameOver) this.gameOver();
    });

    // VFX
    this.setupVfx();

    // Input: pointer for jump + variable jump
    this.input.on("pointerdown", () => {
      if (this.isGameOver) return;

      if (!this._didFirstJump) {
        this._didFirstJump = true;
        this.events.emit("firstJump");
      }

      this._jumpHeld = true;

      this.jumpBufferedAt = this.time.now;
      const jumped = this.tryConsumeJumpBuffer(true);
      if (jumped) {
        this.emitDust(this.player.x - 20, this.groundTopY + 6, 10);
      }
    });

    this.input.on("pointerup", () => {
      this._jumpHeld = false;

      // Step 8: jump cut (release early => shorter jump)
      if (!this.player || !this.player.body) return;
      if (this.player.body.velocity.y < 0) {
        this.player.setVelocityY(this.player.body.velocity.y * SETTINGS.jumpCutMultiplier);
      }
    });

    this.scale.on("resize", () => this.applyContainCamera());

    this.installVisibilityPause();
    this.setupAudioFromPrefs();
    this.emitHud();

    // Spawn init
    this._distAcc = 0;
    this._gapTarget = this.pickGapPx();
    this.spawnObstaclePack();

    this._wasGrounded = false;
  }

  // ---------- Ground ----------
  tryCreateTilemapGround() {
    if (!this.cache.tilemap || !this.cache.tilemap.exists("ground_map")) return false;
    if (!this.textures.exists("ground_tiles")) return false;

    try {
      const map = this.make.tilemap({ key: "ground_map" });
      const tiles = map.addTilesetImage("ground_tiles", "ground_tiles");
      if (!tiles) return false;

      const layer = map.createLayer("Ground", tiles, 0, 0);
      if (!layer) return false;

      layer.setCollisionByExclusion([-1], true);
      this.groundLayer = layer;

      const bounds = layer.getBounds();
      this.groundTopY = bounds.bottom - map.tileHeight;

      return true;
    } catch (_) {
      return false;
    }
  }

  createFallbackGround() {
    const groundY = BASE_H - SETTINGS.groundHeight;
    this.groundY = groundY;
    this.groundTopY = groundY - (SETTINGS.groundHeight / 2);

    this.ground = this.physics.add.staticImage(BASE_W / 2, groundY, "ground");
    this.ground.setScale(BASE_W / this.ground.width, 1).refreshBody();
  }

  // ---------- reset ----------
  resetRunState() {
    this.speed = SETTINGS.startSpeed;
    this.score = 0;
    this.isGameOver = false;

    this.lastGroundedAt = 0;
    this.jumpBufferedAt = -99999;

    this.aliveMs = 0;

    this._distAcc = 0;
    this._gapTarget = 0;

    this._pausedByVisibility = false;
    this._didFirstJump = false;

    this._lastSpawnWasDouble = false;

    this._wasGrounded = false;

    this._jumpHeld = false;
    this._jumpHoldUntil = 0;

    if (this.obstacles) {
      const obs = this.obstacles.getChildren();
      for (let i = obs.length - 1; i >= 0; i--) this.recycleObstacle(obs[i]);
    }

    if (this.player && this.player.body) this.player.body.enable = true;

    if (this.physics && this.physics.world) this.physics.world.resume();
    if (this.time) this.time.timeScale = 1;

    if (this._hitStopTimer) {
      this._hitStopTimer.remove(false);
      this._hitStopTimer = null;
    }

    if (this._bgm) {
      try { this._bgm.stop(); } catch (_) {}
      this._bgm = null;
    }
  }

  emitHud() {
    this.events.emit("score", 0);
    this.events.emit("speed", this.speed);
    this.events.emit("best", loadHighScore());
    this.events.emit("audioState", { muted: this.sound.mute, volume: this.sound.volume });
  }

  // ---------- audio ----------
  setupAudioFromPrefs() {
    const muted = loadMute();
    const volume = loadVolume();

    this.sound.mute = muted;
    this.sound.volume = volume;

    const hasBgm = this.cache.audio && this.cache.audio.exists("bgm");
    const hasJump = this.cache.audio && this.cache.audio.exists("sfx_jump");
    const hasHit = this.cache.audio && this.cache.audio.exists("sfx_hit");

    if (hasJump) this._sfxJump = this.sound.add("sfx_jump", { volume: 1 });
    if (hasHit) this._sfxHit = this.sound.add("sfx_hit", { volume: 1 });

    if (hasBgm) {
      this._bgm = this.sound.add("bgm", { loop: true, volume: 0.6 });
      this._bgm.play();
    }
  }

  setMuted(isMuted) {
    this.sound.mute = !!isMuted;
    saveMute(this.sound.mute);
    this.events.emit("audioState", { muted: this.sound.mute, volume: this.sound.volume });
  }

  setVolume(v) {
    this.sound.volume = Math.max(0, Math.min(1, v));
    saveVolume(this.sound.volume);
    this.events.emit("audioState", { muted: this.sound.mute, volume: this.sound.volume });
  }

  playJumpSfx() { if (this._sfxJump) { try { this._sfxJump.play(); } catch (_) {} } }
  playHitSfx() { if (this._sfxHit) { try { this._sfxHit.play(); } catch (_) {} } }

  // ---------- VFX ----------
  setupVfx() {
    this._dust = this.add.particles(0, 0, "fx_dot", {
      lifespan: 320,
      speed: { min: 40, max: 170 },
      angle: { min: 200, max: 340 },
      scale: { start: 0.7, end: 0 },
      quantity: 0,
      emitting: false
    });
    this._dust.setDepth(5);
  }

  emitDust(x, y, qty) {
    if (!this._dust) return;
    this._dust.emitParticleAt(x, y, qty);
  }

  hitFlash() {
    if (!this.player) return;

    this.player.setTintFill(0xffffff);
    this.tweens.add({
      targets: this.player,
      alpha: 0.35,
      duration: 60,
      yoyo: true,
      repeat: 2,
      onComplete: () => {
        if (!this.player) return;
        this.player.clearTint();
        this.player.setAlpha(1);
      }
    });
  }

  // ---------- Step 8: camera shake + hitstop ----------
 doHitStopAndShake() {
  const cam = this.cameras.main;
  cam.shake(SETTINGS.hitShakeDurationMs, SETTINGS.hitShakeIntensity);

  const ms = SETTINGS.hitStopMs;

  // Pause physics only (DO NOT set timeScale=0)
  this.physics.world.pause();

  // Use real timer so it always resumes
  setTimeout(() => {
    if (!this.isGameOver) {
      try { this.physics.world.resume(); } catch (_) {}
    }
  }, ms);
}


  // ---------- update ----------
  update(_, delta) {
    if (this.isGameOver) return;
    if (this._pausedByVisibility) return;

    const dt = Math.min(delta / 1000, 0.05);
    this.aliveMs += delta;

    // Parallax
    for (let i = 0; i < this.bgLayers.length; i++) {
      const l = this.bgLayers[i];
      l.tilePositionX += this.speed * l._parallaxMul * dt;
    }

    // grounded transitions for land dust
    const grounded = !!(this.player && this.player.body && this.player.body.blocked.down);
    if (grounded && !this._wasGrounded) {
      this.emitDust(this.player.x - 10, this.groundTopY + 6, 14);
    }
    this._wasGrounded = grounded;

    // grounded tracking
    if (grounded) this.lastGroundedAt = this.time.now;

    // Step 8: variable jump hold (small extra lift while holding)
    this.applyJumpHoldBoost();

    // clamp fall speed + faster fall
    this.applyFallPolish();

    // buffered jump (no sfx here)
    this.tryConsumeJumpBuffer(false);

    // move obstacles
    const obs = this.obstacles.getChildren();
    for (let i = obs.length - 1; i >= 0; i--) {
      const o = obs[i];
      o.x -= this.speed * dt;
      if (o.x < -250) this.recycleObstacle(o);
    }

    // spawn
    this.trySpawnByDistance(dt);

    // score
    this.score += this.speed * dt * 0.02;
    this.events.emit("score", Math.floor(this.score));

    // speed ramp
    let ramp = SETTINGS.speedRampPerSec;
    if (this.aliveMs >= SETTINGS.extraRampAfterSec * 1000) ramp += SETTINGS.extraRampBonus;

    this.speed = clamp(this.speed + ramp * dt, SETTINGS.startSpeed, SETTINGS.maxSpeed);
    this.events.emit("speed", this.speed);
  }

  applyJumpHoldBoost() {
    if (!this.player || !this.player.body) return;

    const now = this.time.now;

    // when jump is initiated, we set hold window
    if (this._jumpHoldUntil > 0 && now <= this._jumpHoldUntil && this._jumpHeld) {
      // only while going up
      if (this.player.body.velocity.y < 0) {
        this.player.setAccelerationY(SETTINGS.jumpHoldForce);
        return;
      }
    }

    this.player.setAccelerationY(0);
  }

  applyFallPolish() {
    if (!this.player || !this.player.body) return;

    const vy = this.player.body.velocity.y;

    // faster fall gravity feel (only when falling)
    if (vy > 0) {
      this.player.setGravityY(SETTINGS.gravityY * SETTINGS.fallGravityMultiplier);
    } else {
      this.player.setGravityY(SETTINGS.gravityY);
    }

    // clamp max fall speed
    if (vy > SETTINGS.maxFallSpeed) {
      this.player.setVelocityY(SETTINGS.maxFallSpeed);
    }
  }

  tryConsumeJumpBuffer(allowSfx) {
    const now = this.time.now;

    const buffered = (now - this.jumpBufferedAt) <= SETTINGS.jumpBufferMs;
    if (!buffered) return false;

    const coyoteOk = (now - this.lastGroundedAt) <= SETTINGS.coyoteMs;
    if (this.player.body.blocked.down || coyoteOk) {
      this.jumpBufferedAt = -99999;

      this.player.setAccelerationY(0);
      this.player.setVelocityY(SETTINGS.jumpVelocity);

      // Step 8: start hold window on actual jump
      this._jumpHoldUntil = now + SETTINGS.jumpHoldMs;

      if (allowSfx) this.playJumpSfx();
      return true;
    }
    return false;
  }

  // ---------- spawning ----------
  trySpawnByDistance(dt) {
    if (this._gapTarget <= 0) this._gapTarget = this.pickGapPx();

    this._distAcc += this.speed * dt;

    if (this._distAcc >= this._gapTarget) {
      const spawnX = BASE_W + SETTINGS.obstacleXPad;

      const rightMostX = this.getRightMostActiveObstacleX();
      const minSep = (SETTINGS.minGapPx != null) ? SETTINGS.minGapPx : 320;
      if (rightMostX > spawnX - (minSep * 0.6)) {
        this._distAcc = this._gapTarget;
        return;
      }

      this._distAcc = 0;
      this._gapTarget = this.pickGapPx();
      this.spawnObstaclePack();
    }
  }

  getRightMostActiveObstacleX() {
    let maxX = -99999;
    const obs = this.obstacles.getChildren();
    for (let i = 0; i < obs.length; i++) {
      const o = obs[i];
      if (!o.active) continue;
      if (o.x > maxX) maxX = o.x;
    }
    return maxX;
  }

  pickGapPx() {
    const t = clamp(
      (this.speed - SETTINGS.startSpeed) / (SETTINGS.maxSpeed - SETTINGS.startSpeed),
      0, 1
    );
    const min = SETTINGS.minGapPx + t * 40;
    const max = SETTINGS.maxGapPx + t * 80;
    return Math.floor(randRange(min, max));
  }

  spawnObstaclePack() {
    const t = clamp(
      (this.speed - SETTINGS.startSpeed) / (SETTINGS.maxSpeed - SETTINGS.startSpeed),
      0, 1
    );

    const canDouble = !this._lastSpawnWasDouble && t > 0.25;
    const doubleChance = canDouble ? (0.08 + t * 0.08) : 0;
    const flyChance = 0.18 + t * 0.12;

    const r = Math.random();

    if (r < doubleChance) {
      this._lastSpawnWasDouble = true;
      this.spawnSingleObstacle("ground", 0);
      this.spawnSingleObstacle("ground", 95);
      return;
    }

    this._lastSpawnWasDouble = false;

    if (r < doubleChance + flyChance) {
      this.spawnSingleObstacle("fly", 0);
      return;
    }

    this.spawnSingleObstacle("ground", 0);
  }

  spawnSingleObstacle(kind, extraX) {
    const x = BASE_W + SETTINGS.obstacleXPad + (extraX || 0);

    let y;
    let tex;

    if (kind === "fly") {
      tex = this.pickFlyingTextureKey();
      const minY = this.groundTopY - 280;
      const maxY = this.groundTopY - 180;
      y = Math.floor(randRange(minY, maxY));
    } else {
      tex = this.pickGroundTextureKey();
      y = (this.groundTopY + 2) + (SETTINGS.obstacleYOffset || 0);
    }

    const o = this.getObstacleFromPool(tex);

    if (kind === "fly") o.setOrigin(0.5, 0.5);
    else o.setOrigin(0.5, 1);

    o.setPosition(x, y);
    o.setActive(true);
    o.setVisible(true);

    o.body.allowGravity = false;
    o.body.immovable = true;

    this.applyObstacleTuning(o, kind);

    if (!o._addedToGroup) {
      this.obstacles.add(o);
      o._addedToGroup = true;
    }
  }

  applyObstacleTuning(o, kind) {
    const sMin = (SETTINGS.obstacleScaleMin != null) ? SETTINGS.obstacleScaleMin : 1;
    const sMax = (SETTINGS.obstacleScaleMax != null) ? SETTINGS.obstacleScaleMax : 1;
    const s = randRange(sMin, sMax);
    o.setScale(s);

    if (o.body) {
      let wMul = 0.7;
      let hMul = 0.85;
      if (kind === "fly") { wMul = 0.65; hMul = 0.75; }

      const w = Math.max(10, o.displayWidth * wMul);
      const h = Math.max(10, o.displayHeight * hMul);
      o.body.setSize(w, h, true);
    }
  }

  recycleObstacle(o) {
    o.setActive(false);
    o.setVisible(false);
    o.setPosition(-9999, -9999);
    this.obstaclePool.push(o);
  }

  pickGroundTextureKey() {
    const options = [];
    if (this.textures.exists("obs_rock")) options.push("obs_rock");
    if (this.textures.exists("obs_spike")) options.push("obs_spike");
    if (options.length === 0) return "obstacle";
    return options[Math.floor(Math.random() * options.length)];
  }

  pickFlyingTextureKey() {
    if (this.textures.exists("obs_bird")) return "obs_bird";
    return "obstacle_fly";
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

  // ---------- pause on tab switch ----------
  installVisibilityPause() {
    if (this._visibilityInstalled) return;
    this._visibilityInstalled = true;

    this._onVisibility = () => {
      if (document.hidden) {
        if (this.isGameOver) return;
        this._pausedByVisibility = true;
        this.physics.world.pause();
        this.time.timeScale = 0;
        this.sound.mute = true;
        this.events.emit("pauseChanged", true);
      } else {
        if (this.isGameOver) return;
        this._pausedByVisibility = false;
        this.physics.world.resume();
        this.time.timeScale = 1;
        this.sound.mute = loadMute();
        this.events.emit("pauseChanged", false);
      }
    };

    document.addEventListener("visibilitychange", this._onVisibility);
    this.events.once("shutdown", () => {
      document.removeEventListener("visibilitychange", this._onVisibility);
    });
  }

  // ---------- Game Over ----------
  gameOver() {
    this.isGameOver = true;

    this._pausedByVisibility = false;
    this.physics.world.resume();
    this.time.timeScale = 1;
    this.events.emit("pauseChanged", false);

    this.player.setVelocity(0, 0);
    this.player.body.enable = false;

    // Step 8: juice
    this.playHitSfx();
    this.hitFlash();
    this.doHitStopAndShake();

    if (this._bgm) { try { this._bgm.stop(); } catch (_) {} }

    const scoreInt = Math.floor(this.score);
    const prevHS = loadHighScore();
    const highScore = Math.max(prevHS, scoreInt);
    if (highScore !== prevHS) saveHighScore(highScore);

    this.events.emit("best", highScore);
    this.events.emit("gameover", { score: scoreInt, highScore });
  }

  // ---------- Camera + parallax ----------
  applyContainCamera() {
    const cam = this.cameras.main;
    const vw = this.scale.gameSize.width;
    const vh = this.scale.gameSize.height;
    const zoom = Math.min(vw / BASE_W, vh / BASE_H);
    cam.setZoom(zoom);
    cam.centerOn(BASE_W / 2, BASE_H / 2);
  }

  addParallaxLayer(textureKey, speedMul) {
    const key = this.textures.exists(textureKey) ? textureKey : "bg1";
    const ts = this.add.tileSprite(0, 0, BASE_W, BASE_H, key).setOrigin(0);
    ts.setScrollFactor(0);

    const tex = this.textures.get(key).getSourceImage();
    const scaleY = BASE_H / tex.height;
    ts.setScale(scaleY);

    ts._parallaxMul = speedMul;
    this.bgLayers.push(ts);
    return ts;
  }
};
