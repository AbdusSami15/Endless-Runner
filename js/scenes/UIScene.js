class UIScene extends Phaser.Scene {
  constructor() {
    super("UIScene");
  }

  create() {
    window.applyCoverCamera(this);

    this.score = 0;
    this.speed = 0;

    this.scoreText = this.add.text(60, 50, "SCORE: 0", {
      fontFamily: "Arial Black",
      fontSize: "42px",
      color: "#ffffff"
    }).setScrollFactor(0).setDepth(2000);

    this.speedText = this.add.text(window.BASE_W - 60, 50, "SPD: 0", {
      fontFamily: "Arial Black",
      fontSize: "42px",
      color: "#a5b4fc"
    }).setOrigin(1, 0).setScrollFactor(0).setDepth(2000);

    // Listen to GameScene events
    const gameScene = this.scene.get("GameScene");
    gameScene.events.on("ui", (msg) => {
      if (!msg) return;
      if (msg.type === "score") {
        this.score = msg.value;
        this.scoreText.setText("SCORE: " + this.score);
      } else if (msg.type === "speed") {
        this.speed = msg.value;
        this.speedText.setText("SPD: " + this.speed);
      }
    });

    // Keep UI anchored in base world (camera cover handles viewport)
    this.scale.on("resize", () => window.applyCoverCamera(this));
  }
}
