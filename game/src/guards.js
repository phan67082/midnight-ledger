// guards.js — one job: guard brains. A guard patrols waypoints, grows
// suspicious when it glimpses the thief, searches the last seen (or heard)
// spot, chases on full alarm, then gives up and returns to patrol.
// States: patrol, suspicious, search, chase, return.
import { TILE, GUARD_PATROL_SPEED, GUARD_SEARCH_SPEED, GUARD_CHASE_SPEED, CONE_RANGE_LIT, CONE_HALF_ANGLE, SUSPICION_RATE, SUSPICION_DECAY } from './config.js';
import { seesThief, hasLineOfSight } from './vision.js';

export function createGuard(def, index) {
  const start = def.path[0];
  return {
    id: index,
    path: def.path,
    pause: def.pause || 1.0,
    x: (start[0] + 0.5) * TILE,
    y: (start[1] + 0.5) * TILE,
    waypoint: 1 % def.path.length,
    waitTimer: 0,
    angle: 0,
    state: 'patrol',
    suspicion: 0,
    stateTimer: 0,
    investigateX: 0,
    investigateY: 0,
    lastSeenX: 0,
    lastSeenY: 0,
    speed: GUARD_PATROL_SPEED,
  };
}

function solidAt(level, x, y, r) {
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

function moveToward(g, tx, ty, speed, dt, level) {
  const dx = tx - g.x;
  const dy = ty - g.y;
  const d = Math.hypot(dx, dy);
  if (d < 2) return true;
  const step = Math.min(d, speed * dt);
  const nx = g.x + (dx / d) * step;
  const ny = g.y + (dy / d) * step;
  // Axis-separated, like the thief: slide along walls, never through them.
  if (!solidAt(level, nx, g.y, GUARD_R)) g.x = nx;
  if (!solidAt(level, g.x, ny, GUARD_R)) g.y = ny;
  g.angle = Math.atan2(dy, dx);
  return Math.hypot(tx - g.x, ty - g.y) < 4;
}

function turnToward(g, targetAngle, rate, dt) {
  let da = targetAngle - g.angle;
  while (da > Math.PI) da -= 2 * Math.PI;
  while (da < -Math.PI) da += 2 * Math.PI;
  const maxTurn = rate * dt;
  g.angle += Math.max(-maxTurn, Math.min(maxTurn, da));
}

// One tick of one guard. ctx carries the live game: level, thief, noise
// events, and callbacks the guard uses to shout (onSpotted, onNoiseHeard).
export function updateGuard(g, dt, ctx) {
  const { level, thief, time } = ctx;
  const canSee = seesThief(
    level, g.x, g.y, g.angle, CONE_HALF_ANGLE, CONE_RANGE_LIT,
    thief.x, thief.y, thief.visibility,
  );

  if (canSee) {
    g.lastSeenX = thief.x;
    g.lastSeenY = thief.y;
    g.suspicion = Math.min(100, g.suspicion + SUSPICION_RATE * dt);
    if (g.suspicion >= 100 && g.state !== 'chase') {
      g.state = 'chase';
      g.stateTimer = 0;
      ctx.onSpotted(g);
    } else if (g.suspicion >= 35 && g.state === 'patrol') {
      g.state = 'suspicious';
      g.stateTimer = 0;
      g.investigateX = thief.x;
      g.investigateY = thief.y;
    }
  } else {
    g.suspicion = Math.max(0, g.suspicion - SUSPICION_DECAY * dt);
    if (g.state === 'suspicious' && g.suspicion < 12) {
      g.state = 'patrol';
    }
  }

  // A noise ring the guard can hear pulls it to investigate.
  for (const ring of ctx.noiseRings) {
    if (ring.heardBy.has(g.id)) continue;
    if (Math.hypot(g.x - ring.x, g.y - ring.y) < ring.radius + 30) {
      ring.heardBy.add(g.id);
      if (g.state === 'patrol' || g.state === 'suspicious') {
        g.state = 'search';
        g.stateTimer = 0;
        g.investigateX = ring.x;
        g.investigateY = ring.y;
      }
    }
  }

  switch (g.state) {
    case 'patrol': {
      if (g.waitTimer > 0) {
        g.waitTimer -= dt;
        // Look around while waiting at a waypoint.
        g.angle += Math.sin(time * 1.4 + g.id * 2.1) * 0.9 * dt;
        break;
      }
      const wp = g.path[g.waypoint];
      const arrived = moveToward(g, (wp[0] + 0.5) * TILE, (wp[1] + 0.5) * TILE, GUARD_PATROL_SPEED, dt, level);
      if (arrived) {
        g.waypoint = (g.waypoint + 1) % g.path.length;
        g.waitTimer = g.pause;
      }
      break;
    }
    case 'suspicious': {
      // Walk toward the glimpse, looking hard.
      const arrived = moveToward(g, g.investigateX, g.investigateY, GUARD_SEARCH_SPEED, dt, level);
      if (arrived || !canSee) {
        g.stateTimer += dt;
        turnToward(g, g.angle + 1.6, 1.8, dt);
        if (g.stateTimer > 2.4) {
          g.state = 'search';
          g.stateTimer = 0;
        }
      }
      break;
    }
    case 'search': {
      const arrived = moveToward(g, g.investigateX, g.investigateY, GUARD_SEARCH_SPEED, dt, level);
      if (arrived) {
        g.stateTimer += dt;
        // Sweep the area, looking around.
        turnToward(g, g.angle + 2.2, 2.4, dt);
        if (g.stateTimer > 3.2) {
          g.state = 'return';
          g.stateTimer = 0;
        }
      }
      break;
    }
    case 'chase': {
      // Chase the last seen spot; keep chasing while the thief is visible.
      const tx = canSee ? thief.x : g.lastSeenX;
      const ty = canSee ? thief.y : g.lastSeenY;
      const arrived = moveToward(g, tx, ty, GUARD_CHASE_SPEED, dt, level);
      if (!canSee) {
        g.stateTimer += dt;
        if (g.stateTimer > 2.2 || arrived) {
          g.state = 'search';
          g.stateTimer = 0;
          g.investigateX = g.lastSeenX;
          g.investigateY = g.lastSeenY;
        }
      } else {
        g.stateTimer = 0;
      }
      break;
    }
    case 'return': {
      // Walk back to the nearest waypoint, then resume the patrol.
      let best = 0;
      let bestD = Infinity;
      g.path.forEach((wp, i) => {
        const d = Math.hypot((wp[0] + 0.5) * TILE - g.x, (wp[1] + 0.5) * TILE - g.y);
        if (d < bestD) { bestD = d; best = i; }
      });
      const wp = g.path[best];
      const arrived = moveToward(g, (wp[0] + 0.5) * TILE, (wp[1] + 0.5) * TILE, GUARD_PATROL_SPEED, dt, level);
      if (arrived) {
        g.waypoint = (best + 1) % g.path.length;
        g.state = 'patrol';
      }
      break;
    }
  }
}

// The watcher's cone as the renderer needs it: angle, range and alert colour.
export function guardCone(g) {
  return {
    x: g.x,
    y: g.y,
    angle: g.angle,
    halfAngle: CONE_HALF_ANGLE,
    range: CONE_RANGE_LIT,
    alert: g.state === 'chase' || g.suspicion >= 70,
    hot: g.suspicion >= 35,
  };
}

// Is any guard currently chasing? The HUD's detection word reads from this.
export function anyChasing(guards) {
  return guards.some((g) => g.state === 'chase');
}

export function anySuspicious(guards) {
  return guards.some((g) => g.state === 'suspicious' || g.state === 'search' || g.suspicion >= 35);
}
