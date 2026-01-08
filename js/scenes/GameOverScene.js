class GameOverScene extends Phaser.Scene {
  constructor() {
    super("GameOverScene");
  }

  init(data) {
    this.finalScore = data?.score ?? 0;
    this.finalTime = data?.time ?? 0;
  }

  create() {
    window.applyCoverCamera(this);

    // best score
    const key = "endless_best_score";
    const best = parseInt(localStorage.getItem(key) || "0", 10);
    const newBest = this.finalScore > best;
    if (newBest) localStorage.setItem(key, String(this.finalScore));

    // overlay
    this.add.rectangle(window.BASE_W / 2, window.BASE_H / 2, window.BASE_W, window.BASE_H, 0x000000, 0.65);

    this.add.text(window.BASE_W / 2, 320, "GAME OVER", {
      fontFamily: "Arial Black",
      fontSize: "110px",
      color: "#ffffff"
    }).setOrigin(0.5);

    this.add.text(window.BASE_W / 2, 470, `SCORE: ${this.finalScore}`, {
      fontFamily: "Arial Black",
      fontSize: "56px",
      color: "#4cc9f0"
    }).setOrigin(0.5);

    this.add.text(window.BASE_W / 2, 540, `BEST: ${Math.max(best, this.finalScore)}${newBest ? "  (NEW)" : ""}`, {
      fontFamily: "Arial Black",
      fontSize: "44px",
      color: "#a5b4fc"
    }).setOrigin(0.5);

    const restartBtn = this.add.image(window.BASE_W / 2, 720, "btn_pink").setOrigin(0.5);
    const restartTxt = this.add.text(window.BASE_W / 2, 720, "RESTART", {
      fontFamily: "Arial Black",
      fontSize: "42px",
      color: "#ffffff"
    }).setOrigin(0.5);

    restartBtn.setInteractive({ useHandCursor: true });
    restartBtn.on("pointerdown", () => restartBtn.setScale(0.98));
    restartBtn.on("pointerup", () => {
      restartBtn.setScale(1.0);
      this.scene.start("GameScene");
      this.scene.launch("UIScene");
    });

    const homeBtn = this.add.image(window.BASE_W / 2, 860, "btn_pink").setOrigin(0.5);
    homeBtn.setTint(0x111827);
    const homeTxt = this.add.text(window.BASE_W / 2, 860, "HOME", {
      fontFamily: "Arial Black",
      fontSize: "42px",
      color: "#ffffff"
    }).setOrigin(0.5);

    homeBtn.setInteractive({ useHandCursor: true });
    homeBtn.on("pointerdown", () => homeBtn.setScale(0.98));
    homeBtn.on("pointerup", () => {
      homeBtn.setScale(1.0);
      this.scene.start("MenuScene");
    });

    this.scale.on("resize", () => window.applyCoverCamera(this));
  }
}
