// player.js — one job: the thief. Movement with wall collision, stances
// (walk / sprint / crouch), the two tools (coins, matches), and the
// visibility number the guards and cameras read: lit, shadow, crouched,
// hidden in cover.
import { TILE, PLAYER_R, PLAYER_WALK, PLAYER_SPRINT, PLAYER_CROUCH, COIN_COUNT, MATCH_COUNT, COIN_THROW_RANGE, LAMP_DOUSE_RANGE, LAMP_RADIUS } from './config.js';
import { litAt, inCover } from './vision.js';

export function createPlayer(x, y) {
  return {
    x,
    y,
    angle: -Math.PI / 2,
    crouched: false,
    sprinting: false,
    moving: false,
    coins: COIN_COUNT,
    matches: MATCH_COUNT,
    loot: 0,
    lootCount: 0,
    hasObjective: false,
    visibility: 0,
    hidden: false,
    lit: false,
    noiseTimer: 0,
    stepPhase: 0,
  };
}

function blockedAt(level, x, y, r) {
  // Circle vs solid tiles: test the four corners of the bounding box.
  const minTx = Math.floor((x - r) / TILE);
  const maxTx = Math.floor((x + r) / TILE);
  const minTy = Math.floor((y - r) / TILE);
  const maxTy = Math.floor((y + r) / TILE);
  for (let ty = minTy; ty <= maxTy; ty++) {
    for (let tx = minTx; tx <= maxTx; tx++) {
      if (tx < 0 || ty < 0 || tx >= level.cols || ty >= level.rows) return true;
      if (!level.solid[ty][tx]) continue;
      const cx = Math.max(tx * TILE, Math.min(x, (tx + 1) * TILE));
      const cy = Math.max(ty * TILE, Math.min(y, (ty + 1) * TILE));
      if ((x - cx) * (x - cx) + (y - cy) * (y - cy) < r * r) return true;
    }
  }
  return false;
}

function tryMove(player, level, dx, dy) {
  // Axis-separated so the thief slides along walls instead of sticking.
  if (!blockedAt(level, player.x + dx, player.y, PLAYER_R)) player.x += dx;
  if (!blockedAt(level, player.x, player.y + dy, PLAYER_R)) player.y += dy;
}

// One tick. input is {up,down,left,right,sprint,crouch}. Returns events the
// game loop turns into sound and noise rings.
export function updatePlayer(player, dt, input, level) {
  const events = [];
  player.crouched = !!input.crouch;
  const sprint = !!input.sprint && !player.crouched;
  player.sprinting = sprint;
  const speed = player.crouched ? PLAYER_CROUCH : sprint ? PLAYER_SPRINT : PLAYER_WALK;
  let mx = (input.right ? 1 : 0) - (input.left ? 1 : 0);
  let my = (input.down ? 1 : 0) - (input.up ? 1 : 0);
  player.moving = mx !== 0 || my !== 0;
  if (player.moving) {
    const len = Math.hypot(mx, my);
    mx /= len;
    my /= len;
    tryMove(player, level, mx * speed * dt, my * speed * dt);
    player.angle = Math.atan2(my, mx);
    player.stepPhase += speed * dt;
    if (sprint) {
      player.noiseTimer -= dt;
      if (player.noiseTimer <= 0) {
        player.noiseTimer = 0.38;
        events.push({ type: 'noise', x: player.x, y: player.y, radius: 130, loud: true });
      }
    }
  }

  // Visibility: cover hides completely; otherwise lit is 1, shadow 0.45,
  // crouch halves what is left.
  player.hidden = inCover(level, player.x, player.y);
  player.lit = litAt(level, player.x, player.y, LAMP_RADIUS);
  let vis = player.hidden ? 0 : player.lit ? 1 : 0.45;
  if (player.crouched) vis *= 0.55;
  player.visibility = vis;
  return events;
}

// Throw a coin toward a point: it lands, clinks, and rings out noise.
export function throwCoin(player, tx, ty) {
  if (player.coins <= 0) return null;
  player.coins -= 1;
  const dx = tx - player.x;
  const dy = ty - player.y;
  const d = Math.hypot(dx, dy);
  const range = Math.min(d, COIN_THROW_RANGE);
  const lx = player.x + (dx / (d || 1)) * range;
  const ly = player.y + (dy / (d || 1)) * range;
  return { x: lx, y: ly };
}

// Douse the nearest lit lamp within reach. Returns the lamp or null.
export function douseLamp(player, level) {
  if (player.matches <= 0) return null;
  let best = null;
  let bestD = LAMP_DOUSE_RANGE;
  for (const lamp of level.lamps) {
    if (!lamp.lit) continue;
    const d = Math.hypot(lamp.x - player.x, lamp.y - player.y);
    if (d < bestD) { bestD = d; best = lamp; }
  }
  if (!best) return null;
  best.lit = false;
  player.matches -= 1;
  return best;
}

// Pick up loot / the objective under the thief's feet. The objective can
// only be taken when allowObjective is true (the Ledger stays locked in the
// vault until it is cracked). Returns what was taken.
export function collectAt(player, level, allowObjective = true) {
  const found = [];
  for (const item of level.loot) {
    if (item.taken) continue;
    if (Math.hypot(item.x - player.x, item.y - player.y) < 26) {
      item.taken = true;
      player.loot += item.value;
      player.lootCount += 1;
      found.push({ kind: 'loot', value: item.value });
    }
  }
  const obj = level.objective;
  if (allowObjective && obj && !obj.taken && Math.hypot(obj.x - player.x, obj.y - player.y) < 30) {
    obj.taken = true;
    player.hasObjective = true;
    if (level.exit) level.exit.open = true;
    found.push({ kind: 'objective', name: obj.name });
  }
  return found;
}
