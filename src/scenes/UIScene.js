window.UIScene = class UIScene extends Phaser.Scene {
  constructor() { super("UIScene"); }

  create() {
    this.applyContainCamera();

    this.safe = (typeof getSafeAreaInsets === "function") ? getSafeAreaInsets() : { top: 0, right: 0, bottom: 0, left: 0 };
    this.uiPadX = 20 + Math.floor(this.safe.left);
    this.uiPadY = 18 + Math.floor(this.safe.top);

    this.input.topOnly = true;

    this.scoreText = this.add.text(this.uiPadX, this.uiPadY, "Score: 0", {
      fontSize: "30px", color: "#ffffff"
    });

    this.bestText = this.add.text(this.uiPadX, this.uiPadY + 34, "Best: 0", {
      fontSize: "22px", color: "#a5b4fc"
    });

    this.speedText = this.add.text(this.uiPadX, this.uiPadY + 62, "Speed: 0", {
      fontSize: "22px", color: "#cbd5e1"
    });

    this.hintText = this.add.text(BASE_W / 2, BASE_H - 220, "TAP TO JUMP", {
      fontSize: "34px", color: "#ffffff", fontStyle: "700"
    }).setOrigin(0.5);

    this.pauseBadge = this.add.text(BASE_W / 2, this.uiPadY + 90, "PAUSED", {
      fontSize: "32px", color: "#ffffff", fontStyle: "800"
    }).setOrigin(0.5);
    this.pauseBadge.setVisible(false);

    // HUD audio controls
    this.buildAudioUI();

    const game = this.scene.get("GameScene");

    game.events.on("score", (s) => this.scoreText.setText("Score: " + this.formatNumber(s)));
    game.events.on("best", (b) => this.bestText.setText("Best: " + this.formatNumber(b)));
    game.events.on("speed", (v) => this.speedText.setText("Speed: " + Math.floor(v)));

    game.events.on("firstJump", () => {
      if (!this.hintText || !this.hintText.active) return;
      this.tweens.add({
        targets: this.hintText,
        alpha: 0,
        duration: 450,
        ease: "Linear",
        onComplete: () => { if (this.hintText) this.hintText.setVisible(false); }
      });
    });

    game.events.on("pauseChanged", (isPaused) => this.pauseBadge.setVisible(!!isPaused));
    game.events.on("audioState", (st) => this.syncAudioUI(st));

    game.events.on("gameover", (payload) => this.showGameOver(payload));

    this.bestText.setText("Best: " + this.formatNumber(loadHighScore()));
    this.syncAudioUI({ muted: loadMute(), volume: loadVolume() });

    this.scale.on("resize", () => {
      this.applyContainCamera();
      this.safe = (typeof getSafeAreaInsets === "function") ? getSafeAreaInsets() : { top: 0, right: 0, bottom: 0, left: 0 };
      this.uiPadX = 20 + Math.floor(this.safe.left);
      this.uiPadY = 18 + Math.floor(this.safe.top);
      this.relayoutUI();
    });
  }

  // ---------------- AUDIO HUD ----------------
  buildAudioUI() {
    this.audioX = BASE_W - 20 - Math.floor(this.safe.right);
    this.audioY = 20 + Math.floor(this.safe.top);

    this.muteBtnBg = this.add.rectangle(this.audioX, this.audioY, 90, 44, 0x111827, 0.85)
      .setOrigin(1, 0)
      .setStrokeStyle(2, 0x334155, 1);

    this.muteBtnText = this.add.text(this.audioX - 45, this.audioY + 10, "MUTE", {
      fontSize: "18px",
      color: "#ffffff",
      fontStyle: "700"
    }).setOrigin(0.5, 0);

    this.muteBtnBg.setInteractive({ useHandCursor: true });
    this.muteBtnBg.on("pointerdown", () => {
      const game = this.scene.get("GameScene");
      game.setMuted(!loadMute());
    });

    const sliderTop = this.audioY + 54;
    const sliderW = 180;
    const sliderH = 14;

    this.volBarBg = this.add.rectangle(this.audioX, sliderTop, sliderW, sliderH, 0x0b1220, 0.9)
      .setOrigin(1, 0)
      .setStrokeStyle(2, 0x334155, 1);

    this.volFill = this.add.rectangle(this.audioX - sliderW, sliderTop, sliderW, sliderH, 0x2563eb, 0.95)
      .setOrigin(0, 0);

    this.volKnob = this.add.circle(this.audioX - sliderW, sliderTop + sliderH / 2, 10, 0xffffff, 1);

    this.volLabel = this.add.text(this.audioX - 90, sliderTop + 18, "VOL", {
      fontSize: "14px",
      color: "#cbd5e1"
    }).setOrigin(0.5, 0);

    this.volBarBg.setInteractive({ useHandCursor: true });

    // Global listeners (but we'll disable them when GameOver opens)
    this._onHudPointerDown = (p) => this.tryHandleVolumePointer(p, true);
    this._onHudPointerMove = (p) => this.tryHandleVolumePointer(p, false);
    this._onHudPointerUp = () => { this._dragVol = false; };

    this.input.on("pointerdown", this._onHudPointerDown);
    this.input.on("pointermove", this._onHudPointerMove);
    this.input.on("pointerup", this._onHudPointerUp);

    this._hudInputEnabled = true;
  }

  setHudInputEnabled(enabled) {
    this._hudInputEnabled = !!enabled;

    if (this.muteBtnBg) {
      if (enabled) this.muteBtnBg.setInteractive({ useHandCursor: true });
      else this.muteBtnBg.disableInteractive();
    }

    if (this.volBarBg) {
      if (enabled) this.volBarBg.setInteractive({ useHandCursor: true });
      else this.volBarBg.disableInteractive();
    }

    this._dragVol = false;
  }

  tryHandleVolumePointer(pointer, startDrag) {
    if (!this._hudInputEnabled) return;
    if (!this.volBarBg || !this.volBarBg.active) return;

    const b = this.volBarBg.getBounds();
    const inBounds = Phaser.Geom.Rectangle.Contains(b, pointer.x, pointer.y);

    if (startDrag) this._dragVol = inBounds;
    if (!this._dragVol) return;

    const t = (pointer.x - b.left) / (b.right - b.left);
    const v = Math.max(0, Math.min(1, t));

    const game = this.scene.get("GameScene");
    game.setVolume(v);
  }

  syncAudioUI(st) {
    const muted = !!st.muted;
    const vol = (st.volume != null) ? st.volume : loadVolume();

    if (this.muteBtnText) this.muteBtnText.setText(muted ? "UNMUTE" : "MUTE");

    if (!this.volBarBg || !this.volFill || !this.volKnob) return;
    const b = this.volBarBg.getBounds();
    const w = b.width;
    const fillW = Math.max(0, Math.min(w, w * vol));

    this.volFill.width = fillW;
    this.volFill.x = b.left;
    this.volFill.y = b.top;

    this.volKnob.x = b.left + fillW;
    this.volKnob.y = b.top + b.height / 2;
  }

  // ---------------- GAME OVER ----------------
  showGameOver({ score, highScore }) {
    if (this._gameOverShown) return;
    this._gameOverShown = true;

    // IMPORTANT: Disable HUD input so it can't steal clicks
    this.setHudInputEnabled(false);

    const cx = BASE_W / 2;
    const cy = BASE_H / 2;

    // Overlay MUST be interactive to block clicks behind it
    const overlay = this.add.rectangle(cx, cy, BASE_W, BASE_H, 0x000000, 0.65).setOrigin(0.5);
    overlay.setDepth(1000);
    overlay.setInteractive();
    overlay.input.priorityID = 9999;
    overlay.on("pointerdown", (pointer, lx, ly, event) => { if (event && event.stopPropagation) event.stopPropagation(); });

    const panel = this.add.rectangle(cx, cy, 560, 420, 0x0b1220, 0.95).setOrigin(0.5);
    panel.setDepth(1001);
    panel.setInteractive();
    panel.input.priorityID = 10000;
    panel.on("pointerdown", (pointer, lx, ly, event) => { if (event && event.stopPropagation) event.stopPropagation(); });

    const title = this.add.text(cx, cy - 130, "GAME OVER", {
      fontSize: "52px", color: "#ffffff", fontStyle: "800"
    }).setOrigin(0.5);
    title.setDepth(1002);

    const info = this.add.text(
      cx,
      cy - 40,
      `Score: ${this.formatNumber(score)}\nBest: ${this.formatNumber(highScore)}`,
      { fontSize: "30px", color: "#cbd5e1", align: "center", lineSpacing: 10 }
    ).setOrigin(0.5);
    info.setDepth(1002);

    const restart = this.makeBigButton(cx, cy + 120, 360, 84, 0x16a34a, "RESTART");
    restart.setDepth(1003);
    restart.input.priorityID = 20000;

    restart.on("pointerdown", (pointer, lx, ly, event) => {
      if (event && event.stopPropagation) event.stopPropagation();
      this.doRestart();
    });

    const back = this.add.text(cx, cy + 200, "Back to Menu", {
      fontSize: "24px", color: "#93c5fd"
    }).setOrigin(0.5);
    back.setDepth(1003);
    back.setInteractive({ useHandCursor: true });
    back.input.priorityID = 20000;

    back.on("pointerdown", (pointer, lx, ly, event) => {
      if (event && event.stopPropagation) event.stopPropagation();
      this.doBackToMenu();
    });
  }

  doRestart() {
    // Avoid stopping this scene before we schedule the transition
    this.input.enabled = false;

    setTimeout(() => {
      if (this.scene.isActive("GameScene") || this.scene.isPaused("GameScene")) this.scene.stop("GameScene");
      this.scene.stop("UIScene");
      this.scene.start("GameScene");
      this.scene.launch("UIScene");
    }, 0);
  }

  doBackToMenu() {
    this.input.enabled = false;

    setTimeout(() => {
      if (this.scene.isActive("GameScene") || this.scene.isPaused("GameScene")) this.scene.stop("GameScene");
      this.scene.stop("UIScene");
      this.scene.start("MenuScene");
    }, 0);
  }

  makeBigButton(x, y, w, h, fill, label) {
    const c = this.add.container(x, y);
    const bg = this.add.rectangle(0, 0, w, h, fill, 1).setOrigin(0.5);
    bg.setStrokeStyle(2, 0x14532d, 1);

    const txt = this.add.text(0, 0, label, {
      fontSize: "34px", color: "#ffffff", fontStyle: "700"
    }).setOrigin(0.5);

    c.add([bg, txt]);

    c.setSize(w, h);
    c.setInteractive(new Phaser.Geom.Rectangle(-w / 2, -h / 2, w, h), Phaser.Geom.Rectangle.Contains);
    c.setScrollFactor(0);

    return c;
  }

  relayoutUI() {
    this.scoreText.setPosition(this.uiPadX, this.uiPadY);
    this.bestText.setPosition(this.uiPadX, this.uiPadY + 34);
    this.speedText.setPosition(this.uiPadX, this.uiPadY + 62);
    this.pauseBadge.setPosition(BASE_W / 2, this.uiPadY + 90);

    this.audioX = BASE_W - 20 - Math.floor(this.safe.right);
    this.audioY = 20 + Math.floor(this.safe.top);

    if (this.muteBtnBg) this.muteBtnBg.setPosition(this.audioX, this.audioY);
    if (this.muteBtnText) this.muteBtnText.setPosition(this.audioX - 45, this.audioY + 10);

    const sliderTop = this.audioY + 54;
    if (this.volBarBg) this.volBarBg.setPosition(this.audioX, sliderTop);
    if (this.volLabel) this.volLabel.setPosition(this.audioX - 90, sliderTop + 18);

    this.syncAudioUI({ muted: loadMute(), volume: loadVolume() });
  }

  formatNumber(n) {
    return String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ",");
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
