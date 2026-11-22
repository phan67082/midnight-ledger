// vision.js — one job: what a guard or a camera can see.
// Line of sight is a sampled ray over the blocksSight grid; a vision cone
// is a range + half-angle + line of sight. Nothing here knows about game
// state — it only answers geometry questions.
import { TILE } from './config.js';

// True when the straight segment between two points crosses no sight-blocking tile.
export function hasLineOfSight(level, x0, y0, x1, y1) {
  const dx = x1 - x0;
  const dy = y1 - y0;
  const dist = Math.hypot(dx, dy);
  const steps = Math.max(1, Math.ceil(dist / 8));
  for (let i = 1; i < steps; i++) {
    const t = i / steps;
    const tx = Math.floor((x0 + dx * t) / TILE);
    const ty = Math.floor((y0 + dy * t) / TILE);
    if (tx < 0 || ty < 0 || tx >= level.cols || ty >= level.rows) return false;
    if (level.blocksSight[ty][tx]) return false;
  }
  return true;
}

// The cone polygon (apex + arc points) used to paint a vision cone, clipped
// by walls: each ray stops at the first blocking tile.
export function conePolygon(level, x, y, angle, halfAngle, range, rays = 26) {
  const pts = [{ x, y }];
  for (let i = 0; i <= rays; i++) {
    const a = angle - halfAngle + (2 * halfAngle * i) / rays;
    pts.push(rayHit(level, x, y, a, range));
  }
  return pts;
}

// Walk a ray until it hits a sight-blocking tile or reaches range.
export function rayHit(level, x, y, angle, range) {
  const dx = Math.cos(angle);
  const dy = Math.sin(angle);
  const step = 6;
  for (let d = step; d <= range; d += step) {
    const px = x + dx * d;
    const py = y + dy * d;
    const tx = Math.floor(px / TILE);
    const ty = Math.floor(py / TILE);
    if (tx < 0 || ty < 0 || tx >= level.cols || ty >= level.rows) {
      return { x: px, y: py };
    }
    if (level.blocksSight[ty][tx]) return { x: px, y: py };
  }
  return { x: x + dx * range, y: y + dy * range };
}

// Is the thief inside this watcher's cone and visible through the walls?
// visibility is 0..1 (shadow, crouch and cover shrink it); the effective
// range scales with it, so a thief in shadow must be much closer to be seen.
export function seesThief(level, wx, wy, angle, halfAngle, baseRange, tx, ty, visibility) {
  if (visibility <= 0) return false;
  const dx = tx - wx;
  const dy = ty - wy;
  const dist = Math.hypot(dx, dy);
  const range = baseRange * (0.45 + 0.55 * visibility);
  if (dist > range) return false;
  let da = Math.atan2(dy, dx) - angle;
  while (da > Math.PI) da -= 2 * Math.PI;
  while (da < -Math.PI) da += 2 * Math.PI;
  if (Math.abs(da) > halfAngle) return false;
  return hasLineOfSight(level, wx, wy, tx, ty);
}

// Is a point lit by any lit lamp? Used for the thief's visibility.
export function litAt(level, x, y, lampRadius) {
  for (const lamp of level.lamps) {
    if (!lamp.lit) continue;
    if (Math.hypot(x - lamp.x, y - lamp.y) < lampRadius) return true;
  }
  return false;
}

// Is a point inside a planter (cover)? A thief in cover is hidden.
export function inCover(level, x, y) {
  const tx = Math.floor(x / TILE);
  const ty = Math.floor(y / TILE);
  if (tx < 0 || ty < 0 || tx >= level.cols || ty >= level.rows) return false;
  return level.blocksSight[ty][tx] && !level.solid[ty][tx];
}
