// Every tuning number and colour in one place. The playfield is a fixed 1280x720 logical
// area; the renderer scales it to the window, so no rule below depends on the screen size.

export const FIELD = { width: 1280, height: 720 };

/** The simulation's fixed step, in seconds: 60 updates a second whatever the display's rate. */
export const STEP = 1 / 60;

export const PLAYER = {
  radius: 13,
  walkSpeed: 235,
  sneakSpeed: 128,
  grabRange: 34,
  hackRange: 44,
};

export const GUARD = {
  radius: 14,
  patrolSpeed: 96,
  chaseSpeed: 168,
  visionRange: 235,
  visionHalfAngle: 0.56,
  sneakVisionRange: 152,
  suspicionRate: 1.5,
  suspicionDecay: 0.55,
  pauseAtWaypoint: 1.4,
  sweepSpeed: 0.9,
};

export const CAMERA = {
  visionRange: 265,
  visionHalfAngle: 0.42,
  sweepSpeed: 0.55,
  alarmRate: 34,
};

export const ALARM = {
  riseWhileChased: 26,
  decay: 7,
  max: 100,
  ghostLimit: 25,
  diamondTrip: 15,
};

export const TOOLS = {
  coins: 3,
  smoke: 2,
  empCost: 150,
  empCameraOff: 8,
  empCalm: 4,
  smokeSeconds: 4,
  hackSeconds: 1.5,
  cameraOffAfterHack: 12,
};

export const LOOT_VALUE = { gold: 100, gem: 250, painting: 200, diamond: 500 };

export const PALETTE = {
  backdrop: '#0b0d12',
  floorA: '#232733',
  floorB: '#20242f',
  rug: '#5a1f2b',
  rugEdge: '#8a6d3b',
  wall: '#3a4152',
  wallTop: '#4a5266',
  cover: '#2e3442',
  coverTop: '#3d4457',
  vault: '#6b5a2a',
  vaultDoor: '#8a6d3b',
  exit: '#2fae5f',
  exitGlow: '#57e389',
  thief: '#14161c',
  thiefTrim: '#d43a3a',
  guard: '#2b3242',
  guardTrim: '#c8ccd6',
  coneCalm: 'rgba(242, 201, 76, 0.20)',
  coneWary: 'rgba(240, 140, 60, 0.30)',
  coneAlert: 'rgba(229, 83, 75, 0.38)',
  camCone: 'rgba(120, 200, 255, 0.16)',
  lootGold: '#f2c94c',
  lootGem: '#7fe3f0',
  lootPainting: '#e08bb0',
  lootDiamond: '#bfe9ff',
  panel: '#171a21',
  text: '#eef1f5',
  muted: '#9aa1b1',
  alarmLow: '#57e389',
  alarmMid: '#f2c94c',
  alarmHigh: '#e5534b',
};

export const FONT = 'system-ui, -apple-system, "Segoe UI", sans-serif';

/** Where the best score is kept between visits (this browser only). */
export const BEST_KEY = 'meridian-job.best';
