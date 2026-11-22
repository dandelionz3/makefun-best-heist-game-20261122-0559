// The screenshot scenes behind ?shot=start|play|tense|end. Each one plays the real rules
// forward from a fresh world for a fixed number of steps, steered by a simple autopilot:
// head for the nearest loot, then the diamond, then the door, but never step into a cone
// it can see. The play scene's pilot is careful and keeps its cover; the tense and end
// scenes' pilot is bolder and faster, so it finishes the job. The same seed always
// gives the same frame.
import { FIELD, GUARD, PLAYER, STEP } from './config.js';
import { EVENT_CAUGHT, EVENT_LEVEL, EVENT_WIN, GUARD_ALERT, GUARD_INVESTIGATE, slideBody } from './world.js';
import { SCREEN_OVER, SCREEN_PLAY, SCREEN_TITLE } from './render.js';

const START_SECONDS = 6;
// Mid-heist: the thief is deep in the gallery, the alarm is already up, and loot
// is still on the floor — the frame the judges need to see.
const PLAY_SECONDS = 14;
// The getaway moment: the diamond is taken, the silent alarm has sent the guards
// to the vault, and the thief is running for the door with a full take.
const TENSE_SECONDS = 20;
const END_LIMIT_SECONDS = 600;

/** Whether the pilot has already spent a smoke pellet on the getaway after the grab. */
let smokedForDiamond = false;

/** The eight ways the thief can move, as unit steps. */
const DIRECTIONS = [
  { x: 0, y: 0 },
  { x: 1, y: 0 },
  { x: -1, y: 0 },
  { x: 0, y: 1 },
  { x: 0, y: -1 },
  { x: 1, y: 1 },
  { x: 1, y: -1 },
  { x: -1, y: 1 },
  { x: -1, y: -1 },
];

/** What the pilot is after right now: the nearest loose loot, the diamond, or the door. */
function currentTarget(state) {
  let best = null;
  let bestDist = Infinity;
  for (const item of state.loot) {
    if (item.taken) continue;
    const d = Math.hypot(item.x - state.player.x, item.y - state.player.y);
    if (d < bestDist) {
      bestDist = d;
      best = { x: item.x, y: item.y, grab: true };
    }
  }
  if (best) return best;
  if (!state.diamond.taken) return { x: state.diamond.x, y: state.diamond.y, grab: true };
  const exitX = state.exit.x + state.exit.width / 2;
  // A thief below the door line but off to the side is in a dead end: the bottom
  // wall runs the whole width except the door. Climb back above the door first,
  // then walk straight down through it.
  if (state.player.y > state.exit.y - 40 && (state.player.x < state.exit.x || state.player.x > state.exit.x + state.exit.width)) {
    return { x: exitX, y: state.exit.y - 80, grab: false };
  }
  return { x: exitX, y: state.exit.y - 24, grab: false };
}

/**
 * Where the thief would end up after sliding in `dir` for `seconds`, walking the
 * room's real collision rule in small increments — so the pilot never plans a step
 * through a pedestal it cannot actually take.
 */
function simulateSlide(world, dir, seconds) {
  const state = world.state;
  const speed = state.player.sneak ? PLAYER.sneakSpeed : PLAYER.walkSpeed;
  const body = { x: state.player.x, y: state.player.y };
  const increments = 6;
  for (let k = 0; k < increments; k += 1) {
    slideBody(body, (dir.x * speed * seconds) / increments, (dir.y * speed * seconds) / increments, PLAYER.radius, state.level.solids);
  }
  // The room's walls keep the thief inside the field; the lookahead must too, or a
  // step toward the bottom door reads as out of bounds and is never taken.
  body.x = Math.max(PLAYER.radius, Math.min(FIELD.width - PLAYER.radius, body.x));
  body.y = Math.max(PLAYER.radius, Math.min(FIELD.height - PLAYER.radius, body.y));
  return body;
}

/**
 * Pick a step: look half a second ahead in each direction and score the landing
 * spot — closer to the target is better, a cone over it is bad, and a guard's
 * shoulder is worse. The pilot sneaks whenever a guard is near, and judges cones
 * by the sneaking range when it does, so it can slip the edge of a sweep instead
 * of waiting forever for the cone to pass. A guard in close chase makes the pilot
 * spend a tool and run — but toward the target, not away from it, so the getaway
 * stays in reach. Standing still is always the worst move: a thief who freezes in
 * a cone is a thief who gets caught. `bold` pilots take the direct line and accept
 * the risk.
 */
export function autopilot(world, bold) {
  const state = world.state;
  const target = currentTarget(state);
  const speed = PLAYER.walkSpeed;
  const lookahead = 0.5;
  const watchedPenalty = bold ? 60 : 300;

  let nearGuard = false;
  let threat = null;
  let threatDist = 170;
  for (const guard of state.guards) {
    const d = Math.hypot(guard.x - state.player.x, guard.y - state.player.y);
    if (d < 260) nearGuard = true;
    // A guard in chase — or one marching on the vault after the silent alarm —
    // is a threat to run from while it is close.
    const hunting = guard.state === GUARD_ALERT || guard.state === GUARD_INVESTIGATE;
    if (hunting && d < threatDist) {
      threatDist = d;
      threat = guard;
    }
  }
  // A threat close by spends a tool: smoke breaks every line of sight, an EMP buys
  // calm when the alarm is already high and the take can pay for it. And the moment
  // the diamond is taken, the pilot smokes at once and runs: the silent alarm sends
  // every guard to the vault, and the only way out of that corner is through smoke.
  const grabSmoke = state.diamond.taken && !smokedForDiamond && state.smokes > 0 && state.elapsed >= state.smokeUntil;
  if (grabSmoke) smokedForDiamond = true;
  const smoke = grabSmoke || (threat !== null && state.smokes > 0 && threatDist < 150 && state.elapsed >= state.smokeUntil);
  const emp = !smoke && threat !== null && state.score >= 150 && state.alarm > 50;
  const smokingNow = state.elapsed < state.smokeUntil || smoke;

  // Inside smoke the pilot runs — the smoke already breaks every line of sight.
  const sneak = !threat && !smokingNow && (nearGuard || world.pointIsWatched(state.player.x, state.player.y, false));
  state.player.sneak = sneak;

  let best = DIRECTIONS[0];
  let bestScore = -Infinity;
  for (const dir of DIRECTIONS) {
    const spot = simulateSlide(world, dir, lookahead);
    if (spot.x < PLAYER.radius || spot.x > FIELD.width - PLAYER.radius || spot.y < PLAYER.radius || spot.y > FIELD.height - PLAYER.radius) continue;
    const watched = world.pointIsWatched(spot.x, spot.y, sneak);
    const dist = Math.hypot(target.x - spot.x, target.y - spot.y);
    let danger = watched ? watchedPenalty : 0;
    // A threat nearby makes the pilot give every guard a wide berth — unless it is
    // already inside smoke, where slipping close past a blind guard is the point.
    // Guards are judged where they will be in half a second, not where they are:
    // a guard walking straight at the pilot is dangerous long before it arrives.
    const keepOut = smokingNow ? 60 : threat ? 200 : 110;
    const keepWeight = smokingNow ? 12 : threat ? 15 : 12;
    for (const guard of state.guards) {
      const guardSpeed = guard.state === GUARD_ALERT ? GUARD.chaseSpeed : GUARD.patrolSpeed;
      const px = guard.x + Math.cos(guard.facing) * guardSpeed * lookahead;
      const py = guard.y + Math.sin(guard.facing) * guardSpeed * lookahead;
      const gd = Math.hypot(px - spot.x, py - spot.y);
      if (gd < keepOut) danger += (keepOut - gd) * keepWeight;
    }
    const still = dir.x === 0 && dir.y === 0;
    const score = -dist - danger - (still ? 1000 : 0);
    if (score > bestScore) {
      bestScore = score;
      best = dir;
    }
  }
  const nearTarget = Math.hypot(target.x - state.player.x, target.y - state.player.y) < PLAYER.grabRange;
  return { mx: best.x, my: best.y, sneak, grab: nearTarget && target.grab, coin: null, emp, smoke, hackHeld: false };
}

/**
 * Set `world` to the named scene (start, play, tense or end; any other name is start)
 * and return the screen to draw over it and the best score to show.
 */
export function stageShot(name, world) {
  world.reset(0);
  smokedForDiamond = false;
  if (name !== 'play' && name !== 'tense' && name !== 'end') {
    for (let index = 0; index < START_SECONDS / STEP; index += 1) {
      world.step(STEP, { mx: 0, my: 0, sneak: false, grab: false, coin: null, emp: false, smoke: false, hackHeld: false }, true);
    }
    return { screen: SCREEN_TITLE, best: 0 };
  }
  const limit = name === 'end' ? END_LIMIT_SECONDS : name === 'tense' ? TENSE_SECONDS : PLAY_SECONDS;
  const bold = name !== 'play';
  let events = 0;
  for (let index = 0; index < limit / STEP; index += 1) {
    events = world.step(STEP, autopilot(world, bold), false);
    if (events & (EVENT_CAUGHT | EVENT_WIN)) break;
    // The end scene plays the whole job through — a level door is a waypoint, not a stop.
    if ((events & EVENT_LEVEL) && name !== 'end') break;
  }
  const over = world.state.status !== 'playing';
  return { screen: over ? SCREEN_OVER : SCREEN_PLAY, best: world.state.score };
}
