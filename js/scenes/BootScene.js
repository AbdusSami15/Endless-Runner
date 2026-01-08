class BootScene extends Phaser.Scene {
  constructor() {
    super("BootScene");
  }

  preload() {
    // Lightweight loading text
    const t = this.add.text(0, 0, "Loading...", {
      fontFamily: "Arial",
      fontSize: "32px",
      color: "#ffffff"
    }).setOrigin(0.5);

    const center = () => {
      t.setPosition(this.scale.width * 0.5, this.scale.height * 0.5);
    };
    center();
    this.scale.on("resize", center);

    // No external assets required (procedural textures for crisp scaling)
    // If you later add real PNGs, we can swap keys here.
  }

  create() {
    // Create procedural textures once
    this.createTextures();

    // Ensure cover camera behavior even on boot
    window.applyCoverCamera(this);

    this.scene.start("MenuScene");
  }

  createTextures() {
    // Background layers (tileable)
    const makeBG = (key, baseColor, dotColor) => {
      const g = this.make.graphics({ add: false });
      g.fillStyle(baseColor, 1);
      g.fillRect(0, 0, 256, 256);
      g.fillStyle(dotColor, 0.6);
      for (let i = 0; i < 40; i++) {
        const x = Phaser.Math.Between(0, 255);
        const y = Phaser.Math.Between(0, 255);
        const r = Phaser.Math.Between(1, 3);
        g.fillCircle(x, y, r);
      }
      g.generateTexture(key, 256, 256);
      g.destroy();
    };

    makeBG("bg_far", 0x070a12, 0x2b2f46);
    makeBG("bg_near", 0x0b1020, 0x3b82f6);

    // Ground texture (wide)
    {
      const g = this.make.graphics({ add: false });
      g.fillStyle(0x0f172a, 1);
      g.fillRect(0, 0, 512, 96);
      g.fillStyle(0x1f2a44, 1);
      for (let i = 0; i < 20; i++) {
        const x = i * 28 + Phaser.Math.Between(0, 8);
        g.fillRect(x, 58, Phaser.Math.Between(12, 24), 6);
      }
      g.generateTexture("ground_tex", 512, 96);
      g.destroy();
    }

    // Player frames (simple running)
    const makePlayerFrame = (key, color, legOffset) => {
      const g = this.make.graphics({ add: false });
      // body
      g.fillStyle(color, 1);
      g.fillRoundedRect(18, 10, 60, 78, 14);
      // head
      g.fillStyle(0xffffff, 0.12);
      g.fillCircle(48, 20, 12);
      // legs
      g.fillStyle(0x000000, 0.25);
      g.fillRect(28 + legOffset, 74, 12, 18);
      g.fillRect(56 - legOffset, 74, 12, 18);
      g.generateTexture(key, 96, 96);
      g.destroy();
    };

    makePlayerFrame("player_run_1", 0x4cc9f0, 6);
    makePlayerFrame("player_run_2", 0x4cc9f0, 0);

    // Obstacle
    {
      const g = this.make.graphics({ add: false });
      g.fillStyle(0xe63946, 1);
      g.fillRoundedRect(8, 8, 64, 96, 12);
      g.fillStyle(0x000000, 0.18);
      g.fillRect(16, 22, 48, 8);
      g.generateTexture("obstacle_tex", 80, 112);
      g.destroy();
    }

    // UI button
    {
      const g = this.make.graphics({ add: false });
      g.fillStyle(0xf72585, 1);
      g.fillRoundedRect(0, 0, 360, 110, 24);
      g.fillStyle(0xffffff, 0.14);
      g.fillRoundedRect(16, 14, 328, 20, 10);
      g.generateTexture("btn_pink", 360, 110);
      g.destroy();
    }
  }
}
