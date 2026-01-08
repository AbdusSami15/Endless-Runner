window.BASE_W = 720;
window.BASE_H = 1280;

window.SETTINGS = {
  // Player physics
  gravityY: 1700,
  jumpVelocity: -720,

  // Step 8: jump feel (polish)
  maxFallSpeed: 1200,         // clamp fall to avoid crazy drops
  jumpHoldMs: 130,            // holding jump keeps upward velocity a bit longer
  jumpHoldForce: -260,        // extra upward acceleration while holding
  jumpCutMultiplier: 0.45,    // release early => cut jump (smaller hop)
  fallGravityMultiplier: 1.25,// faster fall = snappier platformer feel

  // Speed / difficulty
  startSpeed: 250,
  maxSpeed: 650,
  speedRampPerSec: 6,
  extraRampAfterSec: 30,
  extraRampBonus: 10,

  // Spawn spacing (distance-based)
  minGapPx: 320,
  maxGapPx: 620,

  // Obstacle base offsets
  obstacleXPad: 120,
  obstacleYOffset: 0,
  obstacleScaleMin: 0.9,
  obstacleScaleMax: 1.15,

  // Ground
  groundHeight: 120,

  // Jump helpers
  coyoteMs: 110,
  jumpBufferMs: 120,

  // Step 8: hit feel
  hitStopMs: 80,              // tiny freeze on hit
  hitShakeDurationMs: 160,
  hitShakeIntensity: 0.0075   // camera shake intensity
};
