class MenuScene extends Phaser.Scene {
  constructor() {
    super("MenuScene");

    this.ui = null;
  }

  create() {
    // ---- MENU CAMERA: CONTAIN (NO CROP) ----
    this.applyMenuCamera();

    this.buildUI();

    // Responsive resize
    this.scale.on("resize", () => {
      this.applyMenuCamera();
      this.relayout();
    });

    this.relayout();
  }

  applyMenuCamera() {
    const cam = this.cameras.main;

    const vw = this.scale.gameSize.width;
    const vh = this.scale.gameSize.height;

    // CONTAIN zoom (min, not max)
    const zoom = Math.min(vw / BASE_W, vh / BASE_H);

    cam.setZoom(zoom);
    cam.centerOn(BASE_W / 2, BASE_H / 2);
    cam.setBackgroundColor("#000");
  }

  buildUI() {
    this.ui = this.add.container(BASE_W / 2, BASE_H / 2);

    const title = this.add.text(0, -260, "ENDLESS RUNNER", {
      fontFamily: "Arial Black",
      fontSize: "96px",
      color: "#ffffff"
    }).setOrigin(0.5);

    const sub = this.add.text(0, -160, "Tap / Click to Jump", {
      fontFamily: "Arial",
      fontSize: "36px",
      color: "#9aa5ff"
    }).setOrigin(0.5);

    const btn = this.add.image(0, 40, "btn_pink").setOrigin(0.5);
    const txt = this.add.text(0, 40, "START", {
      fontFamily: "Arial Black",
      fontSize: "44px",
      color: "#ffffff"
    }).setOrigin(0.5);

    this.ui.add([title, sub, btn, txt]);

    btn.setInteractive({ useHandCursor: true });

    btn.on("pointerover", () => btn.setScale(1.05));
    btn.on("pointerout", () => btn.setScale(1));
    btn.on("pointerdown", () => btn.setScale(0.95));

    btn.on("pointerup", async () => {
      btn.setScale(1);

      // Fullscreen + landscape try
      if (!this.scale.isFullscreen) {
        try { await this.scale.startFullscreen(); } catch (_) {}
      }

      try {
        if (screen.orientation?.lock) {
          await screen.orientation.lock("landscape");
        }
      } catch (_) {}

      // ---- SWITCH TO GAME ----
      this.scene.start("GameScene");
      this.scene.launch("UIScene");
    });
  }

  relayout() {
    // Optional: future-proof spacing tweaks
  }
}
