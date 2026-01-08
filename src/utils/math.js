window.clamp = function (v, a, b) {
  return Math.max(a, Math.min(b, v));
};

window.randRange = function (a, b) {
  return a + Math.random() * (b - a);
};
