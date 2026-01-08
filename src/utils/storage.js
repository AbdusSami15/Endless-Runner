(function () {
  const HS_KEY = "er_highscore";
  const MUTE_KEY = "er_mute";
  const VOL_KEY = "er_volume";

  window.loadHighScore = function () {
    const v = Number(localStorage.getItem(HS_KEY) || "0");
    return Number.isFinite(v) ? v : 0;
  };

  window.saveHighScore = function (v) {
    localStorage.setItem(HS_KEY, String(v));
  };

  window.loadMute = function () {
    return localStorage.getItem(MUTE_KEY) === "1";
  };

  window.saveMute = function (isMuted) {
    localStorage.setItem(MUTE_KEY, isMuted ? "1" : "0");
  };

  window.loadVolume = function () {
    const v = Number(localStorage.getItem(VOL_KEY));
    if (!Number.isFinite(v)) return 0.8;
    return Math.max(0, Math.min(1, v));
  };

  window.saveVolume = function (v) {
    const vv = Math.max(0, Math.min(1, Number(v) || 0));
    localStorage.setItem(VOL_KEY, String(vv));
  };

  // Safe area from CSS env()
  window.getSafeAreaInsets = function () {
    const el = document.getElementById("game");
    if (!el) return { top: 0, right: 0, bottom: 0, left: 0 };

    const cs = getComputedStyle(el);
    // padding includes safe-area
    const top = parseFloat(cs.paddingTop) || 0;
    const right = parseFloat(cs.paddingRight) || 0;
    const bottom = parseFloat(cs.paddingBottom) || 0;
    const left = parseFloat(cs.paddingLeft) || 0;

    return { top, right, bottom, left };
  };
})();
