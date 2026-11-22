// The game's rules and state, with no drawing and no browser in it: the thief, the
// patrolling guards and their suspicion, the sweeping cameras, the loot, the alarm meter,
// the tools, and what winning or getting caught means. step() advances one fixed step
// and returns what happened as bit flags, so the caller can react without the world
// knowing about screens or sound. Nothing here allocates after createWorld returns.
import { ALARM, CAMERA, FIELD, GUARD, LOOT_VALUE, PLAYER, STEP, TOOLS } from './config.js';
import { LEVELS } from './levels.js';
import { angleDifference, hasLineOfSight, inVisionCone } from './vision.js';

export const EVENT_LOOT = 1;
export const EVENT_DIAMOND = 2;
export const EVENT_SPOTTED = 4;
export const EVENT_CAUGHT = 8;
export const EVENT_WIN = 16;
export const EVENT_HACK = 32;
export const EVENT_COIN = 64;
export const EVENT_EMP = 128;
export const EVENT_SMOKE = 256;
export const EVENT_LEVEL = 512;

export const GUARD_PATROL = 0;
export const GUARD_SUSPICIOUS = 1;
export const GUARD_ALERT = 2;
export const GUARD_INVESTIGATE = 3;
function circleHitsSolids(x, y, radius, solids) {
  if (x - radius < 0 || x + radius > FIELD.width || y - radius < 0 || y + radius > FIELD.height) return true;
  for (const solid of solids) {
    const cx = Math.max(solid.x, Math.min(x, solid.x + solid.width));
    const cy = Math.max(solid.y, Math.min(y, solid.y + solid.height));
    if ((x - cx) ** 2 + (y - cy) ** 2 < radius * radius) return true;
  }
  return false;
}

/** Slide a circle through the room: try x, then y, keeping the axes that stay clear. */
export function slideBody(body, dx, dy, radius, solids) {
  if (!circleHitsSolids(body.x + dx, body.y, radius, solids)) body.x += dx;
  if (!circleHitsSolids(body.x, body.y + dy, radius, solids)) body.y += dy;
}

export function createWorld(random) {
  const state = {
    levelIndex: 0,
    level: LEVELS[0],
    player: { x: 0, y: 0, facing: -Math.PI / 2, sneak: false, moving: false },
    guards: [],
    cameras: [],
    loot: [],
    diamond: { x: 0, y: 0, taken: false },
    exit: { x: 0, y: 0, width: 0, height: 0 },
    panel: { x: 0, y: 0 },
    alarm: 0,
    score: 0,
    coins: TOOLS.coins,
    smokes: TOOLS.smoke,
    hackProgress: 0,
    cameraOffUntil: -1,
    empUntil: -1,
    smokeUntil: -1,
    elapsed: 0,
    levelElapsed: 0,
    silentAlarm: false,
    ghost: true,
    status: 'playing',
    bustedReason: '',
    banner: '',
    bannerUntil: -1,
    coinPings: [],
    timeBonus: 0,
  };

  function reset(levelIndex) {
    const level = LEVELS[levelIndex];
    state.levelIndex = levelIndex;
    state.level = level;
    state.player.x = level.start.x;
    state.player.y = level.start.y;
    state.player.facing = -Math.PI / 2;
    state.player.sneak = false;
    state.player.moving = false;
    state.guards = level.guards.map((g) => ({
      x: g.waypoints[0].x,
      y: g.waypoints[0].y,
      waypoints: g.waypoints,
      wpIndex: 1 % g.waypoints.length,
      facing: 0,
      pause: 0,
      sweep: 0,
      state: GUARD_PATROL,
      suspicion: 0,
      lastSeen: { x: 0, y: 0 },
      lookTimer: 0,
      lostTimer: 0,
    }));
    state.cameras = level.cameras.map((c) => ({ ...c, angle: c.baseAngle, sees: false }));
    state.loot = level.loot.map((l) => ({ ...l, taken: false }));
    state.diamond = { x: level.diamond.x, y: level.diamond.y, taken: false };
    state.exit = { ...level.exit };
    state.panel = { ...level.panel };
    state.alarm = 0;
    state.hackProgress = 0;
    state.cameraOffUntil = -1;
    state.empUntil = -1;
    state.smokeUntil = -1;
    state.elapsed = 0;
    state.levelElapsed = 0;
    state.silentAlarm = false;
    state.ghost = true;
    state.status = 'playing';
    state.bustedReason = '';
    state.banner = '';
    state.bannerUntil = -1;
    state.coinPings = [];
    state.timeBonus = 0;
    if (levelIndex === 0) {
      state.score = 0;
      state.coins = TOOLS.coins;
      state.smokes = TOOLS.smoke;
    } else {
      state.coins = TOOLS.coins;
      state.smokes = TOOLS.smoke;
    }
  }

  function showBanner(text, seconds) {
    state.banner = text;
    state.bannerUntil = state.elapsed + seconds;
  }

  function camerasOff() {
    return state.elapsed < state.cameraOffUntil;
  }

  function smokeUp() {
    return state.elapsed < state.smokeUntil;
  }

  function empCalm() {
    return state.elapsed < state.empUntil;
  }

  function guardSees(guard) {
    if (smokeUp()) return false;
    const range = GUARD.visionRange;
    return inVisionCone(
      guard.x, guard.y, guard.facing, range, GUARD.visionHalfAngle,
      state.player.x, state.player.y, state.level.solids, state.player.sneak,
    );
  }

  function cameraSees(camera) {
    if (smokeUp() || camerasOff()) return false;
    return inVisionCone(
      camera.x, camera.y, camera.angle, CAMERA.visionRange, CAMERA.visionHalfAngle,
      state.player.x, state.player.y, state.level.solids, state.player.sneak,
    );
  }

  /** True when standing at (x, y) would be inside any live cone right now. */
  function pointIsWatched(x, y, sneak = false) {
    for (const guard of state.guards) {
      if (inVisionCone(guard.x, guard.y, guard.facing, GUARD.visionRange, GUARD.visionHalfAngle, x, y, state.level.solids, sneak)) return true;
    }
    for (const camera of state.cameras) {
      if (!camerasOff() && inVisionCone(camera.x, camera.y, camera.angle, CAMERA.visionRange, CAMERA.visionHalfAngle, x, y, state.level.solids, sneak)) return true;
    }
    return false;
  }

  function stepGuard(guard, dt) {
    const player = state.player;
    const seen = guardSees(guard);
    if (seen) {
      const dist = Math.hypot(player.x - guard.x, player.y - guard.y);
      guard.suspicion = Math.min(1, guard.suspicion + GUARD.suspicionRate * (1.7 - dist / GUARD.visionRange) * dt);
      guard.lastSeen.x = player.x;
      guard.lastSeen.y = player.y;
      guard.lostTimer = 0;
      if (guard.suspicion >= 1 && guard.state !== GUARD_ALERT) {
        guard.state = GUARD_ALERT;
        showBanner('SPOTTED — run!', 1.6);
      }
    } else {
      guard.suspicion = Math.max(0, guard.suspicion - GUARD.suspicionDecay * dt);
      if (guard.state === GUARD_ALERT) {
        guard.lostTimer += dt;
        if (guard.lostTimer > 3) {
          guard.state = GUARD_SUSPICIOUS;
          guard.lookTimer = 0;
        }
      }
    }
    if (empCalm() && guard.state === GUARD_ALERT) guard.state = GUARD_SUSPICIOUS;

    const speed = guard.state === GUARD_ALERT ? GUARD.chaseSpeed : GUARD.patrolSpeed;
    let target = null;
    if (guard.state === GUARD_ALERT) {
      target = seen ? { x: player.x, y: player.y } : guard.lastSeen;
    } else if (guard.state === GUARD_INVESTIGATE) {
      target = guard.lastSeen;
    } else if (guard.state === GUARD_SUSPICIOUS) {
      target = guard.lastSeen;
    } else {
      target = guard.waypoints[guard.wpIndex];
    }

    const dx = target.x - guard.x;
    const dy = target.y - guard.y;
    const dist = Math.hypot(dx, dy);
    if (guard.state === GUARD_PATROL && dist < 6) {
      if (guard.pause <= 0) guard.pause = GUARD.pauseAtWaypoint;
    }
    if (guard.pause > 0) {
      guard.pause -= dt;
      guard.sweep += dt * GUARD.sweepSpeed;
      guard.facing += Math.sin(guard.sweep) * 0.02;
      if (guard.pause <= 0 && guard.state === GUARD_PATROL) {
        guard.wpIndex = (guard.wpIndex + 1) % guard.waypoints.length;
      }
      return;
    }
    if ((guard.state === GUARD_SUSPICIOUS || guard.state === GUARD_INVESTIGATE) && dist < 8) {
      guard.lookTimer += dt;
      guard.facing += dt * 0.8;
      if (guard.lookTimer > 1.8) {
        guard.state = GUARD_PATROL;
        guard.suspicion = 0;
      }
      return;
    }
    if (dist > 1) {
      const stepX = (dx / dist) * speed * dt;
      const stepY = (dy / dist) * speed * dt;
      slideBody(guard, stepX, stepY, GUARD.radius, state.level.solids);
      guard.facing = Math.atan2(dy, dx);
    }
  }

  /**
   * One fixed step. `input` is { mx, my, sneak, grab, coin, emp, smoke, hackHeld }.
   * With `harmless` set (the title screen's backdrop) the room lives but nothing can
   * spot the thief and nothing scores.
   */
  function step(dt, input, harmless) {
    if (state.status !== 'playing') return 0;
    let events = 0;
    state.elapsed += dt;
    state.levelElapsed += dt;
    if (state.banner && state.elapsed > state.bannerUntil) state.banner = '';

    const player = state.player;
    const solids = state.level.solids;
    const speed = input.sneak ? PLAYER.sneakSpeed : PLAYER.walkSpeed;
    const len = Math.hypot(input.mx, input.my);
    player.sneak = input.sneak;
    player.moving = len > 0.1;
    if (len > 0.1) {
      const nx = input.mx / len;
      const ny = input.my / len;
      slideBody(player, nx * speed * dt, ny * speed * dt, PLAYER.radius, solids);
      player.facing = Math.atan2(ny, nx);
    }

    // Tools: a thrown coin, an EMP burst, a smoke pellet.
    if (input.coin && state.coins > 0 && !harmless) {
      state.coins -= 1;
      const ping = { x: Math.max(20, Math.min(FIELD.width - 20, input.coin.x)), y: Math.max(20, Math.min(FIELD.height - 20, input.coin.y)), at: state.elapsed };
      state.coinPings.push(ping);
      let nearest = null;
      let nearestDist = 420;
      for (const guard of state.guards) {
        const d = Math.hypot(guard.x - ping.x, guard.y - ping.y);
        if (d < nearestDist) {
          nearestDist = d;
          nearest = guard;
        }
      }
      if (nearest) {
        nearest.state = GUARD_INVESTIGATE;
        nearest.lastSeen.x = ping.x;
        nearest.lastSeen.y = ping.y;
        nearest.lookTimer = 0;
      }
      events |= EVENT_COIN;
    }
    if (input.emp && state.score >= TOOLS.empCost && state.elapsed >= state.empUntil && !harmless) {
      state.score -= TOOLS.empCost;
      state.cameraOffUntil = state.elapsed + TOOLS.empCameraOff;
      state.empUntil = state.elapsed + TOOLS.empCalm;
      for (const guard of state.guards) {
        if (guard.state === GUARD_ALERT) guard.state = GUARD_SUSPICIOUS;
        guard.suspicion = Math.min(guard.suspicion, 0.4);
      }
      showBanner('EMP burst — cameras dark, guards dazed', 2);
      events |= EVENT_EMP;
    }
    if (input.smoke && state.smokes > 0 && !harmless) {
      state.smokes -= 1;
      state.smokeUntil = state.elapsed + TOOLS.smokeSeconds;
      showBanner('Smoke — you are unseen', 1.6);
      events |= EVENT_SMOKE;
    }

    // The security panel: hold E beside it to kill the cameras for a while.
    const panelDist = Math.hypot(player.x - state.panel.x, player.y - state.panel.y);
    if (input.hackHeld && panelDist < PLAYER.hackRange && !harmless) {
      state.hackProgress += dt;
      if (state.hackProgress >= TOOLS.hackSeconds) {
        state.hackProgress = 0;
        state.cameraOffUntil = state.elapsed + TOOLS.cameraOffAfterHack;
        showBanner('Cameras disabled — 12 seconds of dark', 2);
        events |= EVENT_HACK;
      }
    } else {
      state.hackProgress = Math.max(0, state.hackProgress - dt * 2);
    }

    // Grab loot, and the diamond.
    if (input.grab && !harmless) {
      for (const item of state.loot) {
        if (!item.taken && Math.hypot(player.x - item.x, player.y - item.y) < PLAYER.grabRange) {
          item.taken = true;
          state.score += LOOT_VALUE[item.kind];
          events |= EVENT_LOOT;
        }
      }
      if (!state.diamond.taken && Math.hypot(player.x - state.diamond.x, player.y - state.diamond.y) < PLAYER.grabRange) {
        state.diamond.taken = true;
        state.score += LOOT_VALUE.diamond;
        state.silentAlarm = true;
        state.alarm = Math.min(ALARM.max, state.alarm + ALARM.diamondTrip);
        for (const guard of state.guards) {
          guard.state = GUARD_INVESTIGATE;
          guard.lastSeen.x = state.diamond.x;
          guard.lastSeen.y = state.diamond.y;
          guard.lookTimer = 0;
        }
        showBanner('THE MERIDIAN DIAMOND IS YOURS — silent alarm tripped, get out!', 3);
        events |= EVENT_DIAMOND;
      }
    }

    // Guards and cameras.
    let anyoneAlert = false;
    let cameraOnPlayer = false;
    for (const guard of state.guards) {
      if (!harmless) stepGuard(guard, dt);
      else {
        // Title backdrop: patrol only, never suspicious.
        const target = guard.waypoints[guard.wpIndex];
        const dx = target.x - guard.x;
        const dy = target.y - guard.y;
        const dist = Math.hypot(dx, dy);
        if (dist < 6) guard.wpIndex = (guard.wpIndex + 1) % guard.waypoints.length;
        else {
          slideBody(guard, (dx / dist) * GUARD.patrolSpeed * dt, (dy / dist) * GUARD.patrolSpeed * dt, GUARD.radius, solids);
          guard.facing = Math.atan2(dy, dx);
        }
      }
      if (guard.state === GUARD_ALERT) anyoneAlert = true;
      if (!harmless && Math.hypot(player.x - guard.x, player.y - guard.y) < PLAYER.radius + GUARD.radius + 2) {
        state.status = 'busted';
        state.bustedReason = 'A guard laid hands on you.';
        return events | EVENT_CAUGHT;
      }
    }
    for (const camera of state.cameras) {
      camera.angle = camera.baseAngle + Math.sin(state.elapsed * camera.speed) * camera.sweep;
      camera.sees = !harmless && cameraSees(camera);
      if (camera.sees) cameraOnPlayer = true;
    }

    // The alarm meter: climbs while anyone has eyes on you, falls when you vanish.
    if (!harmless) {
      if (anyoneAlert || cameraOnPlayer) {
        const rate = cameraOnPlayer ? CAMERA.alarmRate : ALARM.riseWhileChased;
        state.alarm = Math.min(ALARM.max, state.alarm + rate * dt);
        if (anyoneAlert || cameraOnPlayer) events |= EVENT_SPOTTED;
      } else {
        state.alarm = Math.max(0, state.alarm - ALARM.decay * dt);
      }
      if (state.alarm > ALARM.ghostLimit) state.ghost = false;
      if (state.alarm >= ALARM.max) {
        state.status = 'busted';
        state.bustedReason = 'Lockdown. The alarm hit the roof and the doors sealed.';
        return events | EVENT_CAUGHT;
      }
    }

    // The getaway: the door only opens for a thief carrying the diamond.
    const exit = state.exit;
    const inExit =
      player.x > exit.x && player.x < exit.x + exit.width &&
      player.y > exit.y - 30 && player.y < exit.y + exit.height;
    if (inExit && !harmless) {
      if (state.diamond.taken) {
        state.timeBonus = Math.max(0, Math.round(300 - state.levelElapsed * 2));
        state.score += state.timeBonus + (state.ghost ? 200 : 0);
        if (state.levelIndex + 1 < LEVELS.length) {
          events |= EVENT_LEVEL;
          reset(state.levelIndex + 1);
          showBanner(`${state.level.name} — ${state.level.brief}`, 3.5);
          return events;
        }
        state.status = 'won';
        return events | EVENT_WIN;
      }
      showBanner('The getaway only opens for the diamond. Steal it first.', 2);
    }
    return events;
  }

  reset(0);
  return { state, reset, step, pointIsWatched, camerasOff, smokeUp };
}
