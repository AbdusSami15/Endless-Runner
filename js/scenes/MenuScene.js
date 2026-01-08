class MenuScene extends Phaser.Scene {
  constructor() {
    super("MenuScene");
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

    startBtn.on("pointerup", () => {
      startBtn.setScale(1.03);

      this.tryFullscreenLandscape();

      this.scene.start("GameScene");
      this.scene.launch("UIScene");
    });
  }

  tryFullscreenLandscape() {
    if (this.scale && this.scale.isFullscreen !== true) {
      this.scale.startFullscreen();
    }

    try {
      if (screen.orientation && screen.orientation.lock) {
        screen.orientation.lock("landscape").catch(() => {});
      }
    } catch (_) {}
  }
}
