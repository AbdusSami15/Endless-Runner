window.MenuScene = class MenuScene extends Phaser.Scene {
  constructor() {
    super("MenuScene");
    this._modal = null;
  }

  create() {
    this.applyContainCamera();

    const cx = BASE_W / 2;
    const cy = BASE_H / 2;

    this.add.text(cx, cy - 170, "ENDLESS RUNNER", {
      fontSize: "56px",
      color: "#ffffff",
      fontStyle: "700"
    }).setOrigin(0.5);

    this.add.text(cx, cy - 90, "Tap / Click to Jump\nAvoid Obstacles\nSurvive & Score", {
      fontSize: "28px",
      color: "#cbd5e1",
      align: "center",
      lineSpacing: 10
    }).setOrigin(0.5);

    this.hsText = this.add.text(cx, cy + 40, `High Score: ${loadHighScore()}`, {
      fontSize: "28px",
      color: "#a5b4fc"
    }).setOrigin(0.5);

    const startBtn = this.makeButton(cx, cy + 150, 380, 84, 0x2563eb, "START");
    startBtn.onClick(async () => {
      await this.tryFullscreenAndLandscape();
      this.scene.start("GameScene");
      this.scene.launch("UIScene");
    });

    const settingsBtn = this.makeButton(cx, cy + 250, 380, 70, 0x111827, "SETTINGS");
    settingsBtn.onClick(() => this.openSettings());

    const creditsBtn = this.makeButton(cx, cy + 335, 380, 70, 0x111827, "CREDITS");
    creditsBtn.onClick(() => this.openCredits());

    this.scale.on("resize", () => this.applyContainCamera());
  }

  makeButton(x, y, w, h, fill, label) {
    const bg = this.add.rectangle(x, y, w, h, fill, 1).setOrigin(0.5).setStrokeStyle(2, 0x334155, 1);
    const txt = this.add.text(x, y, label, {
      fontSize: "30px",
      color: "#ffffff",
      fontStyle: "700"
    }).setOrigin(0.5);

    bg.setInteractive({ useHandCursor: true });

    return {
      onClick: (fn) => {
        bg.on("pointerdown", fn);
      }
    };
  }

  async tryFullscreenAndLandscape() {
    try {
      const el = document.documentElement;
      if (el.requestFullscreen && !document.fullscreenElement) {
        await el.requestFullscreen();
      }
    } catch (_) {}

    try {
      if (screen.orientation && screen.orientation.lock) {
        await screen.orientation.lock("landscape");
      }
    } catch (_) {}
  }

  openSettings() {
    this.closeModal();

    const cx = BASE_W / 2;
    const cy = BASE_H / 2;

    const modal = this.add.container(0, 0);
    modal.add(this.add.rectangle(cx, cy, BASE_W, BASE_H, 0x000000, 0.65).setOrigin(0.5));

    modal.add(this.add.rectangle(cx, cy, 600, 520, 0x0b1220, 0.97).setOrigin(0.5).setStrokeStyle(2, 0x334155, 1));
    modal.add(this.add.text(cx, cy - 210, "SETTINGS", { fontSize: "42px", color: "#ffffff", fontStyle: "800" }).setOrigin(0.5));

    const muteLabel = this.add.text(cx - 190, cy - 120, "Mute", { fontSize: "28px", color: "#cbd5e1" }).setOrigin(0, 0.5);
    modal.add(muteLabel);

    const muteBtnBg = this.add.rectangle(cx + 200, cy - 120, 220, 56, 0x111827, 1).setOrigin(0.5).setStrokeStyle(2, 0x334155, 1);
    const muteBtnText = this.add.text(cx + 200, cy - 120, loadMute() ? "ON" : "OFF", { fontSize: "28px", color: "#ffffff", fontStyle: "700" }).setOrigin(0.5);
    modal.add(muteBtnBg);
    modal.add(muteBtnText);

    muteBtnBg.setInteractive({ useHandCursor: true });
    muteBtnBg.on("pointerdown", () => {
      const next = !loadMute();
      saveMute(next);
      this.sound.mute = next;
      muteBtnText.setText(next ? "ON" : "OFF");
    });

    const volLabel = this.add.text(cx - 190, cy - 40, "Volume", { fontSize: "28px", color: "#cbd5e1" }).setOrigin(0, 0.5);
    modal.add(volLabel);

    const sliderW = 360;
    const sliderH = 16;

    const volBg = this.add.rectangle(cx + 60, cy - 40, sliderW, sliderH, 0x111827, 1).setOrigin(0.5).setStrokeStyle(2, 0x334155, 1);
    modal.add(volBg);

    const fill = this.add.rectangle(cx + 60 - sliderW / 2, cy - 40, sliderW * loadVolume(), sliderH, 0x2563eb, 1).setOrigin(0, 0.5);
    modal.add(fill);

    const knob = this.add.circle((cx + 60 - sliderW / 2) + sliderW * loadVolume(), cy - 40, 11, 0xffffff, 1);
    modal.add(knob);

    const applyVol = (pointerX) => {
      const left = (cx + 60) - (sliderW / 2);
      const t = (pointerX - left) / sliderW;
      const v = Math.max(0, Math.min(1, t));
      saveVolume(v);
      this.sound.volume = v;

      fill.width = sliderW * v;
      knob.x = left + sliderW * v;
    };

    volBg.setInteractive({ useHandCursor: true });
    volBg.on("pointerdown", (p) => applyVol(p.x));
    this.input.on("pointermove", (p) => {
      if (!this._dragVol) return;
      applyVol(p.x);
    });
    this.input.on("pointerup", () => { this._dragVol = false; });

    volBg.on("pointerdown", (p) => { this._dragVol = true; applyVol(p.x); });

    const closeBtn = this.makeModalButton(cx, cy + 200, "CLOSE");
    closeBtn.bg.on("pointerdown", () => this.closeModal());
    modal.add(closeBtn.bg);
    modal.add(closeBtn.txt);

    this._modal = modal;
  }

  openCredits() {
    this.closeModal();

    const cx = BASE_W / 2;
    const cy = BASE_H / 2;

    const modal = this.add.container(0, 0);
    modal.add(this.add.rectangle(cx, cy, BASE_W, BASE_H, 0x000000, 0.65).setOrigin(0.5));

    modal.add(this.add.rectangle(cx, cy, 600, 520, 0x0b1220, 0.97).setOrigin(0.5).setStrokeStyle(2, 0x334155, 1));
    modal.add(this.add.text(cx, cy - 210, "CREDITS", { fontSize: "42px", color: "#ffffff", fontStyle: "800" }).setOrigin(0.5));

    modal.add(this.add.text(cx, cy - 60,
      "Endless Runner\nBuilt with Phaser 3\n\nDesign / Code: Your Team\nArt: Your Assets\nAudio: Your Assets",
      { fontSize: "28px", color: "#cbd5e1", align: "center", lineSpacing: 10 }
    ).setOrigin(0.5));

    const closeBtn = this.makeModalButton(cx, cy + 200, "CLOSE");
    closeBtn.bg.on("pointerdown", () => this.closeModal());
    modal.add(closeBtn.bg);
    modal.add(closeBtn.txt);

    this._modal = modal;
  }

  makeModalButton(x, y, label) {
    const bg = this.add.rectangle(x, y, 260, 70, 0x16a34a, 1).setOrigin(0.5).setStrokeStyle(2, 0x14532d, 1);
    const txt = this.add.text(x, y, label, { fontSize: "30px", color: "#ffffff", fontStyle: "800" }).setOrigin(0.5);
    bg.setInteractive({ useHandCursor: true });
    return { bg, txt };
  }

  closeModal() {
    if (this._modal) {
      this._modal.destroy(true);
      this._modal = null;
    }
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
