window.UIScene = class UIScene extends Phaser.Scene {
  constructor() { super("UIScene"); }

  create() {
    this.applyContainCamera();

    this.safe = (typeof getSafeAreaInsets === "function") ? getSafeAreaInsets() : { top: 0, right: 0, bottom: 0, left: 0 };
    this.uiPadX = 20 + Math.floor(this.safe.left);
    this.uiPadY = 18 + Math.floor(this.safe.top);

    this.input.topOnly = true;

    this.scoreText = this.add.text(this.uiPadX, this.uiPadY, "Score: 0", { fontSize: "30px", color: "#ffffff" }).setScrollFactor(0);
    this.bestText  = this.add.text(this.uiPadX, this.uiPadY + 34, "Best: 0", { fontSize: "22px", color: "#a5b4fc" }).setScrollFactor(0);
    this.speedText = this.add.text(this.uiPadX, this.uiPadY + 62, "Speed: 0", { fontSize: "22px", color: "#cbd5e1" }).setScrollFactor(0);

    this.hintText = this.add.text(BASE_W / 2, BASE_H - 90, "TAP TO JUMP", {
      fontSize: "34px", color: "#ffffff", fontStyle: "700"
    }).setOrigin(0.5).setScrollFactor(0);

    this.buildAudioUI();

    const game = this.scene.get("GameScene");
    game.events.on("score", (s) => this.scoreText.setText("Score: " + s));
    game.events.on("best", (b) => this.bestText.setText("Best: " + b));
    game.events.on("speed", (v) => this.speedText.setText("Speed: " + Math.floor(v)));
    game.events.on("audioState", (st) => this.syncAudioUI(st));
    game.events.on("firstJump", () => this.fadeHint());
    game.events.on("gameover", (p) => this.showGameOver(p));

    this.syncAudioUI({ muted: loadMute(), volume: loadVolume() });

    this.scale.on("resize", () => {
      this.applyContainCamera();
      this.safe = (typeof getSafeAreaInsets === "function") ? getSafeAreaInsets() : { top: 0, right: 0, bottom: 0, left: 0 };
      this.uiPadX = 20 + Math.floor(this.safe.left);
      this.uiPadY = 18 + Math.floor(this.safe.top);
      this.relayoutUI();
    });
  }

  fadeHint() {
    if (!this.hintText || !this.hintText.active) return;
    this.tweens.add({
      targets: this.hintText,
      alpha: 0,
      duration: 450,
      onComplete: () => { if (this.hintText) this.hintText.setVisible(false); }
    });
  }

  buildAudioUI() {
    this.audioX = BASE_W - 20 - Math.floor(this.safe.right);
    this.audioY = 20 + Math.floor(this.safe.top);

    this.muteBtnBg = this.add.rectangle(this.audioX, this.audioY, 90, 44, 0x111827, 0.85)
      .setOrigin(1, 0).setStrokeStyle(2, 0x334155, 1).setScrollFactor(0);

    this.muteBtnText = this.add.text(this.audioX - 45, this.audioY + 10, "MUTE", {
      fontSize: "18px", color: "#ffffff", fontStyle: "700"
    }).setOrigin(0.5, 0).setScrollFactor(0);

    this.muteBtnBg.setInteractive({ useHandCursor: true });
    this.muteBtnBg.on("pointerdown", () => {
      const game = this.scene.get("GameScene");
      game.setMuted(!loadMute());
    });

    this.sliderW = 180;
    this.sliderH = 14;

    this.sliderXRight = this.audioX;
    this.sliderYTop = this.audioY + 54;

    this.volBarBg = this.add.rectangle(this.sliderXRight, this.sliderYTop, this.sliderW, this.sliderH, 0x0b1220, 0.9)
      .setOrigin(1, 0).setStrokeStyle(2, 0x334155, 1).setScrollFactor(0);

    this.volFill = this.add.rectangle(this.sliderXRight - this.sliderW, this.sliderYTop, this.sliderW, this.sliderH, 0x2563eb, 0.95)
      .setOrigin(0, 0).setScrollFactor(0);

    this.volKnob = this.add.circle(this.sliderXRight - this.sliderW, this.sliderYTop + this.sliderH / 2, 10, 0xffffff, 1)
      .setScrollFactor(0);

    this.volLabel = this.add.text(this.audioX - 90, this.sliderYTop + 18, "VOL", {
      fontSize: "14px", color: "#cbd5e1"
    }).setOrigin(0.5, 0).setScrollFactor(0);

    this.volBarBg.setInteractive({ useHandCursor: true });

    this.input.on("pointerdown", (p) => this.tryHandleVolumePointer(p, true));
    this.input.on("pointermove", (p) => this.tryHandleVolumePointer(p, false));
    this.input.on("pointerup", () => { this._dragVol = false; });
  }

  tryHandleVolumePointer(pointer, startDrag) {
    const left = this.sliderXRight - this.sliderW;
    const right = this.sliderXRight;
    const top = this.sliderYTop;
    const bottom = this.sliderYTop + this.sliderH;

    const inBounds = (pointer.x >= left && pointer.x <= right && pointer.y >= top && pointer.y <= bottom);
    if (startDrag) this._dragVol = inBounds;
    if (!this._dragVol) return;

    const t = (pointer.x - left) / (right - left);
    const v = Math.max(0, Math.min(1, t));

    const game = this.scene.get("GameScene");
    game.setVolume(v);
  }

  syncAudioUI(st) {
    const muted = !!st.muted;
    const vol = (st.volume != null) ? st.volume : loadVolume();

    this.muteBtnText.setText(muted ? "UNMUTE" : "MUTE");

    const left = this.sliderXRight - this.sliderW;
    const fillW = Math.max(0, Math.min(this.sliderW, this.sliderW * vol));

    // ✅ use display size (stable under zoom)
    this.volFill.setPosition(left, this.sliderYTop);
    this.volFill.setDisplaySize(fillW, this.sliderH);

    this.volKnob.setPosition(left + fillW, this.sliderYTop + this.sliderH / 2);
  }

  relayoutUI() {
    this.scoreText.setPosition(this.uiPadX, this.uiPadY);
    this.bestText.setPosition(this.uiPadX, this.uiPadY + 34);
    this.speedText.setPosition(this.uiPadX, this.uiPadY + 62);

    this.audioX = BASE_W - 20 - Math.floor(this.safe.right);
    this.audioY = 20 + Math.floor(this.safe.top);

    this.muteBtnBg.setPosition(this.audioX, this.audioY);
    this.muteBtnText.setPosition(this.audioX - 45, this.audioY + 10);

    this.sliderXRight = this.audioX;
    this.sliderYTop = this.audioY + 54;

    this.volBarBg.setPosition(this.sliderXRight, this.sliderYTop);
    this.volLabel.setPosition(this.audioX - 90, this.sliderYTop + 18);

    this.syncAudioUI({ muted: loadMute(), volume: loadVolume() });
  }

  showGameOver({ score, highScore }) {
    if (this._gameOverShown) return;
    this._gameOverShown = true;

    const cx = BASE_W / 2;
    const cy = BASE_H / 2;

    const overlay = this.add.rectangle(cx, cy, BASE_W, BASE_H, 0x000000, 0.65).setOrigin(0.5).setScrollFactor(0).setDepth(1000);
    overlay.setInteractive(); // block

    const panel = this.add.rectangle(cx, cy, 560, 420, 0x0b1220, 0.95).setOrigin(0.5).setScrollFactor(0).setDepth(1001);

    this.add.text(cx, cy - 130, "GAME OVER", { fontSize: "52px", color: "#ffffff", fontStyle: "800" })
      .setOrigin(0.5).setScrollFactor(0).setDepth(1002);

    this.add.text(cx, cy - 40, `Score: ${score}\nBest: ${highScore}`, {
      fontSize: "30px", color: "#cbd5e1", align: "center", lineSpacing: 10
    }).setOrigin(0.5).setScrollFactor(0).setDepth(1002);

    const restart = this.makeBigButton(cx, cy + 120, 360, 84, 0x16a34a, "RESTART").setDepth(1003);
    restart.on("pointerdown", () => {
      this.scene.stop("UIScene");
      if (this.scene.isActive("GameScene") || this.scene.isPaused("GameScene")) this.scene.stop("GameScene");
      this.scene.start("GameScene");
      this.scene.launch("UIScene");
    });

    const back = this.add.text(cx, cy + 200, "Back to Menu", { fontSize: "24px", color: "#93c5fd" })
      .setOrigin(0.5).setScrollFactor(0).setDepth(1003);

    back.setInteractive({ useHandCursor: true });
    back.on("pointerdown", () => {
      this.scene.stop("UIScene");
      if (this.scene.isActive("GameScene") || this.scene.isPaused("GameScene")) this.scene.stop("GameScene");
      this.scene.start("MenuScene");
    });
  }

  makeBigButton(x, y, w, h, fill, label) {
    const c = this.add.container(x, y).setScrollFactor(0);
    const bg = this.add.rectangle(0, 0, w, h, fill, 1).setOrigin(0.5);
    const txt = this.add.text(0, 0, label, { fontSize: "34px", color: "#ffffff", fontStyle: "700" }).setOrigin(0.5);
    c.add([bg, txt]);
    c.setSize(w, h);
    c.setInteractive(new Phaser.Geom.Rectangle(-w / 2, -h / 2, w, h), Phaser.Geom.Rectangle.Contains);
    return c;
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
