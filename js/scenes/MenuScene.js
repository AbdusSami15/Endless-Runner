class MenuScene extends Phaser.Scene {
  constructor() {
    super("MenuScene");

    this._rotateOverlay = null;
    this._rotateText = null;
    this._orientationHandler = null;
  }

  create() {
    window.applyCoverCamera(this);
    window.bindSafeResize(this);

    const title = this.add.text(window.BASE_W / 2, 260, "ENDLESS RUNNER", {
      fontFamily: "Arial Black",
      fontSize: "84px",
      color: "#ffffff"
    }).setOrigin(0.5);

    const sub = this.add.text(window.BASE_W / 2, 360, "Tap / Click to Jump", {
      fontFamily: "Arial",
      fontSize: "34px",
      color: "#a5b4fc"
    }).setOrigin(0.5);

    const startBtn = this.add.image(window.BASE_W / 2, 620, "btn_pink").setOrigin(0.5);
    const startTxt = this.add.text(window.BASE_W / 2, 620, "START", {
      fontFamily: "Arial Black",
      fontSize: "44px",
      color: "#ffffff"
    }).setOrigin(0.5);

    startBtn.setInteractive({ useHandCursor: true });

    startBtn.on("pointerover", () => startBtn.setScale(1.03));
    startBtn.on("pointerout", () => startBtn.setScale(1.0));
    startBtn.on("pointerdown", () => startBtn.setScale(0.98));

    startBtn.on("pointerup", async () => {
      startBtn.setScale(1.03);

      // 1) Fullscreen + try orientation lock
      await this.enterFullscreenAndLandscape();

      // 2) If still portrait, show rotate overlay and wait
      if (this.isPortrait()) {
        this.showRotateOverlay(true);
        this.waitForLandscapeThenStartGame();
        return;
      }

      // 3) Already landscape -> start game
      this.startGame();
    });

    // If user rotates while on menu, hide overlay when landscape
    this._orientationHandler = () => {
      if (!this._rotateOverlay) return;
      this.showRotateOverlay(this.isPortrait());
      if (!this.isPortrait() && this._pendingStart) {
        this._pendingStart = false;
        this.startGame();
      }
    };

    window.addEventListener("orientationchange", this._orientationHandler);
    window.addEventListener("resize", this._orientationHandler);

    // Initial overlay state (usually off)
    this.showRotateOverlay(this.isPortrait() && this.isMobile());
  }

  isMobile() {
    return this.sys.game.device.os.android || this.sys.game.device.os.iOS;
  }

  isPortrait() {
    // Prefer Screen Orientation API if available
    if (screen.orientation && typeof screen.orientation.type === "string") {
      return screen.orientation.type.includes("portrait");
    }
    return window.innerHeight > window.innerWidth;
  }

  async enterFullscreenAndLandscape() {
    // Fullscreen requires user gesture (we are inside pointerup)
    if (this.scale && !this.scale.isFullscreen) {
      try {
        await this.scale.startFullscreen();
      } catch (_) {
        // ignore
      }
    }

    // Try orientation lock (works only on some browsers/devices)
    try {
      if (screen.orientation && screen.orientation.lock) {
        await screen.orientation.lock("landscape");
      }
    } catch (_) {
      // ignore (not supported / not allowed)
    }
  }

  waitForLandscapeThenStartGame() {
    // Mark that we want to start when landscape happens
    this._pendingStart = true;

    // Also poll a few times (some browsers don't fire orientationchange reliably)
    this.time.addEvent({
      delay: 250,
      repeat: 40, // ~10 seconds
      callback: () => {
        if (!this._pendingStart) return;
        if (!this.isPortrait()) {
          this._pendingStart = false;
          this.showRotateOverlay(false);
          this.startGame();
        }
      }
    });
  }

  showRotateOverlay(show) {
    if (!show) {
      if (this._rotateOverlay) this._rotateOverlay.setVisible(false);
      if (this._rotateText) this._rotateText.setVisible(false);
      return;
    }

    if (!this._rotateOverlay) {
      this._rotateOverlay = this.add.rectangle(
        window.BASE_W / 2,
        window.BASE_H / 2,
        window.BASE_W,
        window.BASE_H,
        0x000000,
        0.75
      ).setDepth(9999);

      this._rotateText = this.add.text(
        window.BASE_W / 2,
        window.BASE_H / 2,
        "Rotate your phone to Landscape",
        {
          fontFamily: "Arial Black",
          fontSize: "54px",
          color: "#ffffff",
          align: "center",
          wordWrap: { width: 1200 }
        }
      ).setOrigin(0.5).setDepth(10000);
    }

    this._rotateOverlay.setVisible(true);
    this._rotateText.setVisible(true);
  }

  startGame() {
    // Clean overlay
    this.showRotateOverlay(false);

    // Start gameplay
    this.scene.start("GameScene");
    this.scene.launch("UIScene");
  }

  shutdown() {
    // Safety cleanup
    if (this._orientationHandler) {
      window.removeEventListener("orientationchange", this._orientationHandler);
      window.removeEventListener("resize", this._orientationHandler);
    }
  }
}
