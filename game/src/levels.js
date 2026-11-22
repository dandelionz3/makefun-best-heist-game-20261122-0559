// The three jobs: one room each, drawn as rectangles. `solids` block feet and sight alike
// (walls, pedestals, cases, desks); `rugs` are floor dressing only. Guards walk their
// waypoints and pause to sweep at each one; cameras hang on a wall and sweep their arc.
// The diamond is the job's target; the exit is the getaway door. Every room is crossed
// three ways: the open hall, the cover line, and the far corridor.

export const LEVELS = [
  {
    name: 'Job 1 — The Gilded Gallery',
    brief: 'A quiet museum after hours. Lift the Meridian Diamond and walk out the service door.',
    start: { x: 110, y: 630 },
    exit: { x: 600, y: 700, width: 90, height: 20 },
    panel: { x: 52, y: 330 },
    diamond: { x: 1152, y: 108 },
    loot: [
      { kind: 'gold', x: 400, y: 300 },
      { kind: 'gem', x: 850, y: 210 },
      { kind: 'painting', x: 640, y: 92 },
      { kind: 'gold', x: 980, y: 480 },
    ],
    solids: [
      { x: 300, y: 150, width: 130, height: 60 },
      { x: 560, y: 230, width: 60, height: 150 },
      { x: 830, y: 330, width: 130, height: 60 },
      { x: 300, y: 470, width: 60, height: 130 },
      { x: 1010, y: 180, width: 60, height: 150 },
      { x: 700, y: 520, width: 130, height: 60 },
    ],
    rugs: [{ x: 420, y: 300, width: 440, height: 130 }],
    guards: [
      { waypoints: [{ x: 480, y: 120 }, { x: 760, y: 120 }, { x: 760, y: 440 }, { x: 480, y: 440 }] },
      { waypoints: [{ x: 1080, y: 420 }, { x: 1080, y: 620 }, { x: 900, y: 620 }] },
    ],
    cameras: [{ x: 640, y: 24, baseAngle: Math.PI / 2, sweep: 0.7, speed: 0.5 }],
  },
  {
    name: 'Job 2 — The Meridian Bank',
    brief: 'Two floors of tellers, one vault. The diamond moved to the bank overnight.',
    start: { x: 110, y: 630 },
    exit: { x: 600, y: 700, width: 90, height: 20 },
    panel: { x: 52, y: 200 },
    diamond: { x: 1152, y: 108 },
    loot: [
      { kind: 'gold', x: 330, y: 200 },
      { kind: 'gold', x: 700, y: 300 },
      { kind: 'gem', x: 950, y: 540 },
      { kind: 'painting', x: 480, y: 92 },
      { kind: 'gold', x: 1080, y: 580 },
    ],
    solids: [
      { x: 260, y: 130, width: 170, height: 50 },
      { x: 560, y: 130, width: 50, height: 170 },
      { x: 820, y: 130, width: 170, height: 50 },
      { x: 260, y: 480, width: 50, height: 130 },
      { x: 560, y: 430, width: 170, height: 50 },
      { x: 860, y: 330, width: 50, height: 170 },
      { x: 1010, y: 180, width: 60, height: 150 },
    ],
    rugs: [
      { x: 400, y: 240, width: 480, height: 120 },
      { x: 900, y: 520, width: 220, height: 90 },
    ],
    guards: [
      { waypoints: [{ x: 380, y: 340 }, { x: 760, y: 340 }, { x: 760, y: 640 }, { x: 460, y: 640 }] },
      { waypoints: [{ x: 980, y: 250 }, { x: 980, y: 520 }] },
      { waypoints: [{ x: 200, y: 420 }, { x: 200, y: 640 }, { x: 460, y: 640 }, { x: 460, y: 420 }] },
    ],
    cameras: [
      { x: 640, y: 24, baseAngle: Math.PI / 2, sweep: 0.6, speed: 0.6 },
      { x: 1256, y: 360, baseAngle: Math.PI, sweep: 0.55, speed: 0.45 },
    ],
  },
  {
    name: 'Job 3 — The Aurelia Casino Vault',
    brief: 'The house always watches. Four guards, three eyes, one diamond. Make it clean.',
    start: { x: 110, y: 630 },
    exit: { x: 600, y: 700, width: 90, height: 20 },
    panel: { x: 52, y: 480 },
    diamond: { x: 1152, y: 108 },
    loot: [
      { kind: 'gold', x: 300, y: 215 },
      { kind: 'gem', x: 640, y: 300 },
      { kind: 'gold', x: 900, y: 210 },
      { kind: 'painting', x: 480, y: 92 },
      { kind: 'gem', x: 1080, y: 500 },
      { kind: 'gold', x: 760, y: 580 },
    ],
    solids: [
      { x: 240, y: 130, width: 120, height: 50 },
      { x: 480, y: 180, width: 50, height: 150 },
      { x: 700, y: 130, width: 120, height: 50 },
      { x: 920, y: 180, width: 50, height: 150 },
      { x: 240, y: 420, width: 120, height: 50 },
      { x: 480, y: 430, width: 50, height: 150 },
      { x: 700, y: 480, width: 120, height: 50 },
      { x: 920, y: 420, width: 50, height: 150 },
      { x: 1060, y: 300, width: 60, height: 120 },
    ],
    rugs: [
      { x: 380, y: 250, width: 520, height: 110 },
      { x: 380, y: 500, width: 520, height: 110 },
    ],
    guards: [
      { waypoints: [{ x: 400, y: 360 }, { x: 640, y: 360 }, { x: 640, y: 620 }, { x: 400, y: 620 }] },
      { waypoints: [{ x: 900, y: 360 }, { x: 1010, y: 360 }, { x: 1010, y: 620 }, { x: 900, y: 620 }] },
      { waypoints: [{ x: 200, y: 300 }, { x: 200, y: 620 }] },
      { waypoints: [{ x: 1150, y: 620 }, { x: 820, y: 620 }] },
    ],
    cameras: [
      { x: 640, y: 24, baseAngle: Math.PI / 2, sweep: 0.6, speed: 0.65 },
      { x: 24, y: 360, baseAngle: 0, sweep: 0.5, speed: 0.5 },
      { x: 1256, y: 360, baseAngle: Math.PI, sweep: 0.5, speed: 0.55 },
    ],
  },
];
