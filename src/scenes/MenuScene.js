window.MenuScene = class MenuScene extends Phaser.Scene {
  constructor() {
    super("MenuScene");
    this._rotateOverlay = null;
  }

  create() {
    this.applyContainCamera();

    const cx = BASE_W / 2;
    const cy = BASE_H / 2;

    this.add.text(cx, cy - 140, "ENDLESS RUNNER", {
      fontSize: "56px",
      color: "#ffffff",
      fontStyle: "700"
    }).setOrigin(0.5);

    this.add.text(cx, cy - 70, "Tap / Click to Jump\nAvoid Obstacles\nSurvive & Score", {
      fontSize: "26px",
      color: "#cbd5e1",
      align: "center",
      lineSpacing: 10
    }).setOrigin(0.5);

    this.add.text(cx, cy + 30, `High Score: ${loadHighScore()}`, {
      fontSize: "26px",
      color: "#a5b4fc"
    }).setOrigin(0.5);

    const startBtn = this.makeButton(cx, cy + 140, 360, 78, 0x2563eb, "START");
    startBtn.on("pointerdown", () => {
      // MUST be in the user gesture
      this.tryFullscreenAndLandscape();

      // Start game
      this.scene.start("GameScene");
      this.scene.launch("UIScene");

      // If still portrait, show overlay (device rotate)
      this.ensureRotateOverlay();
      this.updateRotateOverlay();
    });

    this.scale.on("resize", () => {
      this.applyContainCamera();
      this.updateRotateOverlay();
    });

    window.addEventListener("orientationchange", () => this.updateRotateOverlay());
    window.addEventListener("resize", () => this.updateRotateOverlay());
  }

  tryFullscreenAndLandscape() {
    const el = document.getElementById("game") || document.documentElement;

    // Fullscreen
    try {
      const req = el.requestFullscreen || el.webkitRequestFullscreen || el.mozRequestFullScreen || el.msRequestFullscreen;
      if (req && !document.fullscreenElement && !document.webkitFullscreenElement) {
        req.call(el);
      }
    } catch (_) {}

    // Orientation lock (only works on some browsers/devices)
    try {
      if (screen.orientation && screen.orientation.lock) {
        screen.orientation.lock("landscape").catch(() => {});
      }
    } catch (_) {}
  }

  ensureRotateOverlay() {
    if (this._rotateOverlay) return;

    const cx = BASE_W / 2;
    const cy = BASE_H / 2;

    const overlay = this.add.container(0, 0).setDepth(99999);

    const dim = this.add.rectangle(cx, cy, BASE_W, BASE_H, 0x000000, 0.72).setOrigin(0.5);
    overlay.add(dim);

    const card = this.add.rectangle(cx, cy, 640, 260, 0x0b1220, 0.98)
      .setOrigin(0.5)
      .setStrokeStyle(2, 0x334155, 1);
    overlay.add(card);

    const title = this.add.text(cx, cy - 55, "ROTATE TO LANDSCAPE", {
      fontSize: "38px",
      color: "#ffffff",
      fontStyle: "900"
    }).setOrigin(0.5);
    overlay.add(title);

    const body = this.add.text(cx, cy + 30, "Rotate your phone for best experience.", {
      fontSize: "26px",
      color: "#cbd5e1",
      align: "center"
    }).setOrigin(0.5);
    overlay.add(body);

    this._rotateOverlay = overlay;
  }

  updateRotateOverlay() {
    if (!this._rotateOverlay) return;

    const w = window.innerWidth || 0;
    const h = window.innerHeight || 0;
    const isLandscape = w > h;

    // If already landscape, hide overlay
    this._rotateOverlay.setVisible(!isLandscape);
  }

  makeButton(x, y, w, h, fill, label) {
    const c = this.add.container(x, y);

    const bg = this.add.rectangle(0, 0, w, h, fill, 1).setOrigin(0.5).setStrokeStyle(2, 0x334155, 1);
    const txt = this.add.text(0, 0, label, { fontSize: "30px", color: "#ffffff", fontStyle: "800" }).setOrigin(0.5);

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
