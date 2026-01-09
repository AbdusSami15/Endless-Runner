window.UIScene = class UIScene extends Phaser.Scene {
  constructor() {
    super("UIScene");
    this.scoreText = null;
    this.bestText = null;
    this.speedText = null;
  }

  create() {
    this.scoreText = this.add.text(20, 18, "Score: 0", {
      fontFamily: "Arial",
      fontSize: "26px",
      color: "#ffffff"
    }).setScrollFactor(0).setDepth(20000);

    this.bestText = this.add.text(20, 50, "Best: 0", {
      fontFamily: "Arial",
      fontSize: "20px",
      color: "#ffffff"
    }).setScrollFactor(0).setDepth(20000).setAlpha(0.7);

    this.speedText = this.add.text(20, 76, "Speed: 0", {
      fontFamily: "Arial",
      fontSize: "20px",
      color: "#ffffff"
    }).setScrollFactor(0).setDepth(20000).setAlpha(0.7);

    const game = this.scene.get("GameScene");

    game.events.on("score", (v) => {
      if (this.scoreText) this.scoreText.setText(`Score: ${v}`);
    });

    game.events.on("best", (v) => {
      if (this.bestText) this.bestText.setText(`Best: ${v}`);
    });

    game.events.on("speed", (v) => {
      if (this.speedText) this.speedText.setText(`Speed: ${Math.floor(v)}`);
    });

    this.events.once("shutdown", () => {
      game.events.off("score");
      game.events.off("best");
      game.events.off("speed");
    });
  }
};
