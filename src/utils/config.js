import { BASE_W, BASE_H } from "./settings.js";

import BootScene from "./scenes/BootScene.js";
import PreloadScene from "./scenes/PreloadScene.js";
import MenuScene from "./scenes/MenuScene.js";
import GameScene from "./scenes/GameScene.js";
import UIScene from "./scenes/UIScene.js";

export function makeConfig() {
  return {
    type: Phaser.AUTO,
    parent: "game",
    width: BASE_W,
    height: BASE_H,
    backgroundColor: "#0b0f14",
    physics: {
      default: "arcade",
      arcade: { debug: false }
    },
    scale: {
      mode: Phaser.Scale.FIT,
      autoCenter: Phaser.Scale.CENTER_BOTH
    },
    scene: [BootScene, PreloadScene, MenuScene, GameScene, UIScene]
  };
}
