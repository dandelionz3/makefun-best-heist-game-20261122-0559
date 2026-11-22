// Drawing only: the world's state and the current screen in, pixels out. The 1280x720
// playfield is scaled to fit the window and centred, the margin filled with the backdrop
// colour. Flat shapes and canvas text: the floor, the cover that hides you, the cones
// that hunt you, the loot that pays you, and the alarm meter that ends you. Safe cover,
// danger and loot are coloured so each reads at a glance.
import { ALARM, CAMERA, FIELD, FONT, GUARD, LOOT_VALUE, PALETTE, PLAYER, TOOLS } from './config.js';
import { GUARD_ALERT } from './world.js';

export const SCREEN_TITLE = 'title';
export const SCREEN_PLAY = 'play';
export const SCREEN_PAUSED = 'paused';
export const SCREEN_OVER = 'over';

/** The panel's width; its height grows with its lines: room for the title, the lines and the prompt. */
const PANEL = { width: 640, top: 140, line: 32, bottom: 72 };
const TILE = 80;

function cachedLabel(prefix) {
  let value = null;
  let text = '';
  return function label(next) {
    if (next !== value) {
      value = next;
      text = prefix + next;
    }
    return text;
  };
}

export function createRenderer(canvas) {
  const context = canvas.getContext('2d');
  const view = { scale: 1, x: 0, y: 0 };
  const scoreLabel = cachedLabel('SCORE $');
  const bestLabel = cachedLabel('BEST $');

  function resize() {
    const ratio = window.devicePixelRatio || 1;
    const width = Math.round(window.innerWidth * ratio);
    const height = Math.round(window.innerHeight * ratio);
    canvas.width = width;
    canvas.height = height;
    view.scale = Math.min(width / FIELD.width, height / FIELD.height);
    view.x = (width - FIELD.width * view.scale) / 2;
    view.y = (height - FIELD.height * view.scale) / 2;
  }

  /** Map a client point on the canvas back into field space (for click-to-throw). */
  function toField(clientX, clientY) {
    return { x: (clientX - view.x) / view.scale, y: (clientY - view.y) / view.scale };
  }

  const fonts = new Map();
  function text(value, x, y, size, color, align) {
    if (!fonts.has(size)) fonts.set(size, `${size}px ${FONT}`);
    context.font = fonts.get(size);
    context.fillStyle = color;
    context.textAlign = align;
    context.fillText(value, x, y);
  }

  function drawCone(x, y, facing, range, halfAngle, fill) {
    context.fillStyle = fill;
    context.beginPath();
    context.moveTo(x, y);
    context.arc(x, y, range, facing - halfAngle, facing + halfAngle);
    context.closePath();
    context.fill();
  }

  function drawRoom(state) {
    // Marble floor.
    for (let ty = 0; ty < FIELD.height / TILE; ty += 1) {
      for (let tx = 0; tx < FIELD.width / TILE; tx += 1) {
        context.fillStyle = (tx + ty) % 2 === 0 ? PALETTE.floorA : PALETTE.floorB;
        context.fillRect(tx * TILE, ty * TILE, TILE, TILE);
      }
    }
    for (const rug of state.level.rugs) {
      context.fillStyle = PALETTE.rug;
      context.fillRect(rug.x, rug.y, rug.width, rug.height);
      context.strokeStyle = PALETTE.rugEdge;
      context.lineWidth = 3;
      context.strokeRect(rug.x + 4, rug.y + 4, rug.width - 8, rug.height - 8);
    }
    // Walls: a thick border, top-lit.
    context.fillStyle = PALETTE.wall;
    context.fillRect(0, 0, FIELD.width, 16);
    context.fillRect(0, FIELD.height - 16, FIELD.width, 16);
    context.fillRect(0, 0, 16, FIELD.height);
    context.fillRect(FIELD.width - 16, 0, 16, FIELD.height);
    context.fillStyle = PALETTE.wallTop;
    context.fillRect(0, 0, FIELD.width, 4);
    // The vault alcove behind the diamond, and the getaway door.
    context.fillStyle = PALETTE.vault;
    context.fillRect(state.diamond.x - 70, 16, 140, 66);
    context.fillStyle = PALETTE.vaultDoor;
    context.fillRect(state.diamond.x - 46, 16, 92, 14);
    const exit = state.exit;
    context.fillStyle = state.diamond.taken ? PALETTE.exitGlow : PALETTE.exit;
    context.fillRect(exit.x, exit.y - 4, exit.width, 20);
    // The door sits on the very bottom edge, so its name rides on a pill just
    // above it instead of inside it — inside, the text is cut by the frame.
    context.fillStyle = state.diamond.taken ? PALETTE.exitGlow : PALETTE.exit;
    context.fillRect(exit.x - 8, exit.y - 30, exit.width + 16, 22);
    text('GETAWAY', exit.x + exit.width / 2, exit.y - 14, 13, '#0b0d12', 'center');
    // The security panel on the wall.
    context.fillStyle = '#1c2733';
    context.fillRect(state.panel.x - 12, state.panel.y - 18, 24, 36);
    context.fillStyle = '#7fe3f0';
    context.fillRect(state.panel.x - 8, state.panel.y - 13, 16, 10);
    text('SEC', state.panel.x, state.panel.y + 30, 12, PALETTE.muted, 'center');
  }

  function drawCover(state) {
    for (const solid of state.level.solids) {
      context.fillStyle = PALETTE.cover;
      context.fillRect(solid.x, solid.y, solid.width, solid.height);
      context.fillStyle = PALETTE.coverTop;
      context.fillRect(solid.x, solid.y, solid.width, 6);
      context.strokeStyle = '#454e63';
      context.lineWidth = 2;
      context.strokeRect(solid.x + 1, solid.y + 1, solid.width - 2, solid.height - 2);
    }
  }

  function drawLoot(state) {
    for (const item of state.loot) {
      if (item.taken) continue;
      const pulse = 0.75 + 0.25 * Math.sin(state.elapsed * 3 + item.x);
      if (item.kind === 'gold') {
        context.fillStyle = PALETTE.lootGold;
        context.globalAlpha = pulse;
        context.fillRect(item.x - 11, item.y - 6, 22, 12);
        context.fillStyle = '#fff3c4';
        context.fillRect(item.x - 11, item.y - 6, 22, 4);
        context.globalAlpha = 1;
      } else if (item.kind === 'gem') {
        context.fillStyle = PALETTE.lootGem;
        context.globalAlpha = pulse;
        context.beginPath();
        context.moveTo(item.x, item.y - 11);
        context.lineTo(item.x + 9, item.y);
        context.lineTo(item.x, item.y + 11);
        context.lineTo(item.x - 9, item.y);
        context.closePath();
        context.fill();
        context.globalAlpha = 1;
      } else {
        context.fillStyle = '#6b4a2f';
        context.fillRect(item.x - 16, item.y - 12, 32, 24);
        context.fillStyle = PALETTE.lootPainting;
        context.fillRect(item.x - 12, item.y - 8, 24, 16);
        context.fillStyle = '#f5d7e6';
        context.beginPath();
        context.arc(item.x - 3, item.y - 2, 4, 0, Math.PI * 2);
        context.fill();
      }
    }
    if (!state.diamond.taken) {
      const pulse = 0.7 + 0.3 * Math.sin(state.elapsed * 4);
      context.save();
      context.globalAlpha = pulse;
      context.fillStyle = PALETTE.lootDiamond;
      context.shadowColor = '#bfe9ff';
      context.shadowBlur = 22;
      context.beginPath();
      context.moveTo(state.diamond.x, state.diamond.y - 16);
      context.lineTo(state.diamond.x + 13, state.diamond.y);
      context.lineTo(state.diamond.x, state.diamond.y + 16);
      context.lineTo(state.diamond.x - 13, state.diamond.y);
      context.closePath();
      context.fill();
      context.restore();
      text('MERIDIAN DIAMOND', state.diamond.x, state.diamond.y + 34, 13, PALETTE.lootDiamond, 'center');
    }
  }

  function drawCones(state) {
    for (const guard of state.guards) {
      let fill = PALETTE.coneCalm;
      if (guard.state === GUARD_ALERT) fill = PALETTE.coneAlert;
      else if (guard.suspicion > 0.25) fill = PALETTE.coneWary;
      drawCone(guard.x, guard.y, guard.facing, GUARD.visionRange, GUARD.visionHalfAngle, fill);
    }
    for (const camera of state.cameras) {
      drawCone(camera.x, camera.y, camera.angle, CAMERA.visionRange, CAMERA.visionHalfAngle, camera.sees ? PALETTE.coneAlert : PALETTE.camCone);
    }
  }

  function drawActors(state) {
    // Thrown coins, still ringing.
    for (const ping of state.coinPings) {
      const age = state.elapsed - ping.at;
      if (age > 1.2) continue;
      context.strokeStyle = `rgba(242, 201, 76, ${1 - age / 1.2})`;
      context.lineWidth = 2;
      context.beginPath();
      context.arc(ping.x, ping.y, 6 + age * 26, 0, Math.PI * 2);
      context.stroke();
      context.fillStyle = PALETTE.lootGold;
      context.beginPath();
      context.arc(ping.x, ping.y, 4, 0, Math.PI * 2);
      context.fill();
    }
    // Cameras on their wall mounts.
    for (const camera of state.cameras) {
      context.fillStyle = '#39415a';
      context.beginPath();
      context.arc(camera.x, camera.y, 9, 0, Math.PI * 2);
      context.fill();
      context.fillStyle = camera.sees ? PALETTE.alarmHigh : '#7fe3f0';
      context.beginPath();
      context.arc(camera.x, camera.y, 4, 0, Math.PI * 2);
      context.fill();
    }
    // Guards: dark coats, pale collars, and a suspicion ring that fills as they notice you.
    for (const guard of state.guards) {
      context.fillStyle = PALETTE.guard;
      context.beginPath();
      context.arc(guard.x, guard.y, GUARD.radius, 0, Math.PI * 2);
      context.fill();
      context.strokeStyle = PALETTE.guardTrim;
      context.lineWidth = 2;
      context.beginPath();
      context.moveTo(guard.x, guard.y);
      context.lineTo(guard.x + Math.cos(guard.facing) * (GUARD.radius + 6), guard.y + Math.sin(guard.facing) * (GUARD.radius + 6));
      context.stroke();
      if (guard.suspicion > 0.03) {
        context.strokeStyle = guard.suspicion >= 1 ? PALETTE.alarmHigh : PALETTE.lootGold;
        context.lineWidth = 3;
        context.beginPath();
        context.arc(guard.x, guard.y, GUARD.radius + 6, -Math.PI / 2, -Math.PI / 2 + guard.suspicion * Math.PI * 2);
        context.stroke();
      }
      if (guard.state === GUARD_ALERT) {
        text('!', guard.x, guard.y - GUARD.radius - 8, 20, PALETTE.alarmHigh, 'center');
      }
    }
    // The thief: black coat, red scarf, quiet feet.
    const player = state.player;
    if (state.smokeUntil > state.elapsed) {
      context.fillStyle = 'rgba(200, 204, 214, 0.35)';
      context.beginPath();
      context.arc(player.x, player.y, 46, 0, Math.PI * 2);
      context.fill();
    }
    context.globalAlpha = player.sneak ? 0.85 : 1;
    context.fillStyle = PALETTE.thief;
    context.beginPath();
    context.arc(player.x, player.y, PLAYER.radius, 0, Math.PI * 2);
    context.fill();
    context.strokeStyle = PALETTE.thiefTrim;
    context.lineWidth = 3;
    context.beginPath();
    context.arc(player.x, player.y, PLAYER.radius - 2, player.facing - 0.9, player.facing + 0.9);
    context.stroke();
    context.fillStyle = '#eef1f5';
    context.beginPath();
    context.arc(player.x + Math.cos(player.facing) * 5, player.y + Math.sin(player.facing) * 5, 3, 0, Math.PI * 2);
    context.fill();
    context.globalAlpha = 1;
    // Hack progress ring on the panel.
    if (state.hackProgress > 0) {
      context.strokeStyle = '#7fe3f0';
      context.lineWidth = 4;
      context.beginPath();
      context.arc(state.panel.x, state.panel.y, 26, -Math.PI / 2, -Math.PI / 2 + (state.hackProgress / TOOLS.hackSeconds) * Math.PI * 2);
      context.stroke();
    }
  }

  function drawHud(state, screen) {
    context.textBaseline = 'top';
    // Job name and score, top left.
    text(state.level.name, 24, 18, 19, PALETTE.text, 'left');
    text(scoreLabel(state.score), 24, 42, 26, PALETTE.lootGold, 'left');
    // The alarm meter, top centre: the number that ends the job.
    const meter = { x: FIELD.width / 2 - 160, y: 16, width: 320, height: 22 };
    const frac = state.alarm / ALARM.max;
    const color = frac < 0.4 ? PALETTE.alarmLow : frac < 0.75 ? PALETTE.alarmMid : PALETTE.alarmHigh;
    text('ALARM', meter.x - 10, 18, 19, color, 'right');
    context.fillStyle = '#10131a';
    context.fillRect(meter.x, meter.y, meter.width, meter.height);
    context.fillStyle = color;
    context.fillRect(meter.x, meter.y, meter.width * frac, meter.height);
    context.strokeStyle = '#454e63';
    context.lineWidth = 2;
    context.strokeRect(meter.x, meter.y, meter.width, meter.height);
    if (state.cameraOffUntil > state.elapsed) {
      text('CAMERAS DARK', meter.x + meter.width / 2, meter.y + 30, 14, '#7fe3f0', 'center');
    }
    // Tools, top right.
    const tools = `COINS ${state.coins}   EMP $${TOOLS.empCost} [Q]   SMOKE ${state.smokes} [R]`;
    text(tools, FIELD.width - 24, 18, 17, PALETTE.muted, 'right');
    const lootLeft = state.loot.filter((l) => !l.taken).length + (state.diamond.taken ? 0 : 1);
    text(`LOOT LEFT ${lootLeft}`, FIELD.width - 24, 42, 17, PALETTE.muted, 'right');
    // The banner: what just happened.
    if (state.banner) {
      context.textBaseline = 'alphabetic';
      text(state.banner, FIELD.width / 2, 92, 22, PALETTE.lootGold, 'center');
      context.textBaseline = 'top';
    }
    // Context hint, bottom.
    if (screen === SCREEN_PLAY) {
      const nearLoot = state.loot.some((l) => !l.taken && Math.hypot(state.player.x - l.x, state.player.y - l.y) < PLAYER.grabRange + 6);
      const nearDiamond = !state.diamond.taken && Math.hypot(state.player.x - state.diamond.x, state.player.y - state.diamond.y) < PLAYER.grabRange + 6;
      const nearPanel = Math.hypot(state.player.x - state.panel.x, state.player.y - state.panel.y) < PLAYER.hackRange + 6;
      let hint = 'WASD / arrows — move    SHIFT — sneak    CLICK — throw a coin    E — grab    Q — EMP    R — smoke    P — pause';
      if (nearDiamond) hint = 'E — TAKE THE MERIDIAN DIAMOND';
      else if (nearLoot) hint = 'E — grab the loot';
      else if (nearPanel) hint = 'Hold E — hack the cameras';
      text(hint, FIELD.width / 2, FIELD.height - 64, 16, PALETTE.muted, 'center');
    }
  }

  function drawPanel(title, lines, prompt) {
    const height = PANEL.top + lines.length * PANEL.line + PANEL.bottom;
    const x = (FIELD.width - PANEL.width) / 2;
    const y = (FIELD.height - height) / 2;
    context.fillStyle = 'rgba(10, 12, 17, 0.72)';
    context.fillRect(0, 0, FIELD.width, FIELD.height);
    context.fillStyle = PALETTE.panel;
    context.fillRect(x, y, PANEL.width, height);
    context.strokeStyle = PALETTE.rugEdge;
    context.lineWidth = 2;
    context.strokeRect(x, y, PANEL.width, height);
    context.textBaseline = 'alphabetic';
    text(title, FIELD.width / 2, y + 78, 46, PALETTE.text, 'center');
    for (let index = 0; index < lines.length; index += 1) {
      text(lines[index], FIELD.width / 2, y + PANEL.top + index * PANEL.line, 21, PALETTE.muted, 'center');
    }
    text(prompt, FIELD.width / 2, y + height - 38, 23, PALETTE.lootGold, 'center');
  }

  /** Paint one frame: the room, then the HUD or a panel for the screen the game is on. */
  function draw(state, screen, best) {
    context.setTransform(1, 0, 0, 1, 0, 0);
    context.fillStyle = PALETTE.backdrop;
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.setTransform(view.scale, 0, 0, view.scale, view.x, view.y);
    drawRoom(state);
    drawCones(state);
    drawLoot(state);
    drawCover(state);
    drawActors(state);
    if (screen === SCREEN_TITLE) {
      drawPanel('THE MERIDIAN JOB', [
        'Three rooms. One diamond. No alarms.',
        'Cross the room, lift the loot, take the diamond,',
        'and walk out the getaway door — unseen.',
        'Guards patrol with cones of sight. Cameras sweep.',
        `Best haul so far: $${best}`,
      ], 'Press Space or click to start the job');
      return;
    }
    drawHud(state, screen);
    if (screen === SCREEN_PAUSED) {
      drawPanel('Paused', ['The guards wait. The cameras keep sweeping.', ''], 'Press P to slip back in');
    } else if (screen === SCREEN_OVER) {
      if (state.status === 'won') {
        const ghost = state.ghost ? 'Ghost bonus: never raised the alarm past a whisper.' : '';
        const house = state.ghost
          ? 'The Meridian Diamond is yours. The house never saw you.'
          : 'The Meridian Diamond is yours. Loud, but yours.';
        drawPanel('CLEAN GETAWAY', [
          `Final haul: $${state.score} across three jobs.`,
          ghost,
          house,
        ], 'Press Space or click to run it again');
      } else {
        drawPanel('BUSTED', [state.bustedReason, `You kept $${state.score} of the night's take.`, ''], 'Press Space or click to try again');
      }
    }
  }

  resize();
  window.addEventListener('resize', resize);
  return { draw, toField };
}
