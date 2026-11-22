// main.js — one job: run the game. The state machine (title, playing, crack,
// caught, clear, win), the alarm meter, the cameras and lasers, scoring, and
// the deterministic screenshot mode (?shot=1..4 renders exactly one frame).
import { TILE, VIEW_W, VIEW_H, CAMERA_RANGE, SEARCHLIGHT_RANGE, ALARM_RISE, ALARM_DECAY, LASER_ALARM_HIT, COIN_RING_RADIUS, VAULT_TUMBLERS } from './config.js';
import { LEVELS, parseLevel } from './levels.js';
import { createPlayer, updatePlayer, throwCoin, douseLamp, collectAt } from './player.js';
import { createGuard, updateGuard, guardCone, anyChasing, anySuspicious } from './guards.js';
import { seesThief } from './vision.js';
import { createInput } from './input.js';
import { sfx, unlockAudio } from './audio.js';
import { render } from './render.js';
import { stageShot } from './shots.js';

const canvas = document.getElementById('game');
canvas.width = VIEW_W;
canvas.height = VIEW_H;
const ctx = canvas.getContext('2d');

const game = {
  phase: 'title',
  levelIndex: 0,
  def: LEVELS[0],
  level: null,
  player: null,
  guards: [],
  watchers: [],
  lasers: [],
  cones: [],
  alarm: 0,
  noiseLevel: 0,
  noiseRings: [],
  timeLeft: 0,
  score: 0,
  levelLoot: 0,
  levelTimeBonus: 0,
  levelScore: 0,
  lootAtStart: 0,
  detection: 'UNSEEN',
  ghost: true,
  spottedThisLevel: false,
  crack: null,
  banner: null,
  time: 0,
  blink: true,
  laserCooldown: 0,
  prevMouseDown: false,
  toast: '',
  toastUntil: 0,
};

function setBanner(text, sub, color, seconds = 2.6) {
  game.banner = { text, sub: sub || '', color: color || '#d8b25a', until: game.time + seconds };
}

function loadLevel(index) {
  game.levelIndex = index;
  game.def = LEVELS[index];
  game.level = parseLevel(game.def);
  game.player = createPlayer(game.level.playerStart.x, game.level.playerStart.y);
  game.guards = game.def.guards.map((d, i) => createGuard(d, i));
  game.watchers = [];
  for (const c of game.def.cameras) {
    game.watchers.push({
      x: (c.tx + 0.5) * TILE, y: (c.ty + 0.5) * TILE,
      baseDeg: c.baseDeg, sweepDeg: c.sweepDeg, period: c.period, phase: c.phase,
      angle: 0, range: CAMERA_RANGE, halfAngle: 0.45, kind: 'camera', spotting: false,
    });
  }
  for (const s of game.def.searchlights) {
    game.watchers.push({
      x: (s.tx + 0.5) * TILE, y: (s.ty + 0.5) * TILE,
      baseDeg: s.baseDeg, sweepDeg: s.sweepDeg, period: s.period, phase: s.phase,
      angle: 0, range: SEARCHLIGHT_RANGE, halfAngle: 0.5, kind: 'light', spotting: false,
    });
  }
  game.lasers = game.def.lasers.map((l) => ({
    x1: (l.x1 + 0.5) * TILE, y1: (l.y1 + 0.5) * TILE,
    x2: (l.x2 + 0.5) * TILE, y2: (l.y2 + 0.5) * TILE,
    period: l.period, onTime: l.onTime, phase: l.phase, on: true, t: 0,
  }));
  game.alarm = 0;
  game.noiseLevel = 0;
  game.noiseRings = [];
  game.timeLeft = game.def.timeLimit;
  game.detection = 'UNSEEN';
  game.ghost = true;
  game.spottedThisLevel = false;
  game.crack = null;
  game.banner = null;
  game.lootAtStart = game.player.loot;
  game.levelLoot = 0;
  game.levelTimeBonus = 0;
  game.levelScore = 0;
  updateWatchers(0);
  rebuildCones();
}

game.loadLevel = loadLevel;

function updateWatchers(dt) {
  for (const w of game.watchers) {
    const sweep = (w.sweepDeg * Math.PI) / 180;
    const base = (w.baseDeg * Math.PI) / 180;
    w.angle = base + Math.sin((game.time * Math.PI * 2) / w.period + w.phase) * sweep;
  }
}

function rebuildCones() {
  game.cones = [];
  for (const g of game.guards) game.cones.push({ ...guardCone(g), kind: 'guard' });
  for (const w of game.watchers) {
    game.cones.push({
      x: w.x, y: w.y, angle: w.angle, halfAngle: w.halfAngle, range: w.range,
      alert: w.spotting, kind: w.kind,
    });
  }
}

function addNoiseRing(x, y, maxRadius) {
  game.noiseRings.push({ x, y, radius: 12, maxRadius, heardBy: new Set() });
  game.noiseLevel = 1;
}

function interact() {
  const p = game.player;
  const level = game.level;
  // The vault: step up and crack it.
  if (level.vault && !level.vault.cracked) {
    if (Math.hypot(level.vault.x - p.x, level.vault.y - p.y) < 70) {
      game.phase = 'crack';
      game.crack = {
        angle: -Math.PI / 2,
        zoneStart: 0.4,
        zoneWidth: 0.8,
        tumblers: 0,
        speed: 2.4,
      };
      return;
    }
  }
  const found = collectAt(p, level, !level.vault || level.vault.cracked);
  for (const f of found) {
    if (f.kind === 'loot') sfx.pickup();
    if (f.kind === 'objective') {
      sfx.objective();
      setBanner('OBJECTIVE TAKEN', `${f.name} secured — reach the EXIT`, '#7fe7ff', 3);
    }
  }
}

function tryTumbler() {
  const c = game.crack;
  if (!c) return;
  let a = c.angle % (Math.PI * 2);
  if (a < 0) a += Math.PI * 2;
  let z0 = c.zoneStart % (Math.PI * 2);
  if (z0 < 0) z0 += Math.PI * 2;
  let diff = a - z0;
  if (diff < 0) diff += Math.PI * 2;
  if (diff <= c.zoneWidth) {
    c.tumblers += 1;
    sfx.crack();
    if (c.tumblers >= VAULT_TUMBLERS) {
      game.level.vault.cracked = true;
      game.phase = 'playing';
      game.crack = null;
      sfx.vaultOpen();
      setBanner('VAULT OPEN', 'The Black Ledger is yours for the taking', '#7fe7ff', 3);
    } else {
      c.zoneStart = Math.random() * Math.PI * 2;
      c.speed += 0.7;
    }
  } else {
    sfx.crackFail();
    game.alarm = Math.min(100, game.alarm + 12);
    addNoiseRing(game.player.x, game.player.y, 120);
    setBanner('WRONG TUMBLER', 'The vault clunks — someone may have heard that', '#ff9d2e', 2);
  }
}

function levelClear() {
  game.levelLoot = game.player.loot - game.lootAtStart;
  game.levelTimeBonus = Math.round(game.timeLeft) * 2;
  const ghostBonus = game.ghost ? 150 : 0;
  game.levelScore = game.levelLoot + game.levelTimeBonus + ghostBonus;
  game.score += game.levelScore;
  sfx.clear();
  if (game.levelIndex < LEVELS.length - 1) {
    game.phase = 'clear';
  } else {
    game.phase = 'win';
  }
}

function caught(reason) {
  game.phase = 'caught';
  game.caughtReason = reason;
  sfx.caught();
}

function updatePlaying(dt, input) {
  const p = game.player;
  const events = updatePlayer(p, dt, input, game.level);
  for (const e of events) {
    if (e.type === 'noise') addNoiseRing(e.x, e.y, e.radius);
  }
  game.timeLeft -= dt;
  if (game.timeLeft <= 0) {
    caught('Dawn breaks — the morning crew walks in.');
    return;
  }
  // The alarm may have hit 100 off-tick (a laser trip clamps it there).
  if (game.alarm >= 100) {
    caught('The alarm hit the roof and the house locked down.');
    return;
  }

  // Guards.
  const ctxGuard = {
    level: game.level,
    thief: p,
    time: game.time,
    noiseRings: game.noiseRings,
    onSpotted: (g) => {
      game.spottedThisLevel = true;
      game.ghost = false;
      sfx.spotted();
      setBanner('SPOTTED!', 'Break line of sight — the alarm fades when you are unseen', '#ff5040', 2.4);
    },
  };
  for (const g of game.guards) updateGuard(g, dt, ctxGuard);

  // Cameras and searchlights.
  let watcherSpotting = false;
  for (const w of game.watchers) {
    const seen = seesThief(game.level, w.x, w.y, w.angle, w.halfAngle, w.range, p.x, p.y, p.visibility);
    if (seen && !w.spotting) {
      game.spottedThisLevel = true;
      game.ghost = false;
      sfx.spotted();
      setBanner('ON CAMERA!', 'Get out of the lens — the alarm is climbing', '#ff5040', 2.4);
    }
    w.spotting = seen;
    if (seen) watcherSpotting = true;
  }

  // Lasers.
  game.laserCooldown -= dt;
  for (const laser of game.lasers) {
    laser.t = (laser.t + dt) % laser.period;
    laser.on = laser.t < laser.onTime;
    if (!laser.on) continue;
    const d = distToSegment(p.x, p.y, laser.x1, laser.y1, laser.x2, laser.y2);
    if (d < 13 && game.laserCooldown <= 0) {
      game.laserCooldown = 1.0;
      game.alarm = Math.min(100, game.alarm + LASER_ALARM_HIT);
      addNoiseRing(p.x, p.y, 140);
      sfx.alarm();
      setBanner('LASER TRIPPED!', 'The beam saw you — move!', '#ff5040', 2);
    }
  }

  // Alarm meter.
  const chasing = anyChasing(game.guards);
  if (chasing || watcherSpotting) {
    game.alarm = Math.min(100, game.alarm + ALARM_RISE * dt);
  } else {
    game.alarm = Math.max(0, game.alarm - ALARM_DECAY * dt);
  }
  if (game.alarm >= 100) {
    caught('The alarm hit the roof and the house locked down.');
    return;
  }

  // Caught by touch while chased.
  for (const g of game.guards) {
    if (g.state === 'chase' && Math.hypot(g.x - p.x, g.y - p.y) < 26) {
      caught('A guard laid hands on you in the dark.');
      return;
    }
  }

  // Detection word for the HUD.
  if (chasing || watcherSpotting || game.alarm > 60) game.detection = 'ALARM';
  else if (game.guards.some((g) => g.state === 'search')) game.detection = 'SEARCHING';
  else if (anySuspicious(game.guards)) game.detection = 'SUSPICIOUS';
  else game.detection = 'UNSEEN';

  // Noise rings expand and fade.
  game.noiseRings = game.noiseRings.filter((r) => {
    r.radius += 260 * dt;
    return r.radius < r.maxRadius;
  });
  game.noiseLevel = Math.max(0, game.noiseLevel - dt * 0.7);

  // Pickups on walk-over (objective only once the vault is cracked, if any).
  const allowObjective = !game.level.vault || game.level.vault.cracked;
  const found = collectAt(p, game.level, allowObjective);
  for (const f of found) {
    if (f.kind === 'loot') sfx.pickup();
    if (f.kind === 'objective') {
      sfx.objective();
      setBanner('OBJECTIVE TAKEN', `${f.name} secured — reach the EXIT`, '#7fe7ff', 3);
    }
  }

  // Exit.
  const exit = game.level.exit;
  if (exit && exit.open && Math.hypot(exit.x - p.x, exit.y - p.y) < 26) {
    levelClear();
    return;
  }

  // Tools (click is edge-triggered: one coin per click).
  const clicked = input.mouseDown && !game.prevMouseDown;
  game.prevMouseDown = input.mouseDown;
  if (input.wasPressed('KeyQ') || clicked) {
    const coin = throwCoin(p, input.mouseX, input.mouseY);
    if (coin) {
      addNoiseRing(coin.x, coin.y, COIN_RING_RADIUS);
      sfx.clink();
    }
  }
  if (input.wasPressed('KeyF')) {
    const lamp = douseLamp(p, game.level);
    if (lamp) {
      sfx.douse();
      addNoiseRing(p.x, p.y, 60);
    }
  }
  if (input.wasPressed('KeyE')) interact();

  if (game.banner && game.time > game.banner.until) game.banner = null;
  updateWatchers(dt);
  rebuildCones();
}

function distToSegment(px, py, x1, y1, x2, y2) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const len2 = dx * dx + dy * dy;
  let t = len2 === 0 ? 0 : ((px - x1) * dx + (py - y1) * dy) / len2;
  t = Math.max(0, Math.min(1, t));
  const cx = x1 + t * dx;
  const cy = y1 + t * dy;
  return Math.hypot(px - cx, py - cy);
}

const input = createInput();
let last = performance.now();

function frame(now) {
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  game.time += dt;
  game.blink = Math.floor(game.time * 1.6) % 2 === 0;

  if (game.phase === 'title') {
    if (input.wasPressed('Enter')) {
      unlockAudio();
      game.score = 0;
      loadLevel(0);
      game.phase = 'playing';
    }
  } else if (game.phase === 'playing') {
    updatePlaying(dt, input);
  } else if (game.phase === 'crack') {
    const c = game.crack;
    if (c) {
      c.angle += c.speed * dt;
      if (input.wasPressed('KeyE') || input.wasPressed('Space')) tryTumbler();
      if (input.wasPressed('KeyQ') || input.wasPressed('Escape')) {
        game.phase = 'playing';
        game.crack = null;
      }
    }
  } else if (game.phase === 'caught') {
    if (input.wasPressed('KeyR')) {
      loadLevel(game.levelIndex);
      game.phase = 'playing';
    }
  } else if (game.phase === 'clear') {
    if (input.wasPressed('Enter')) {
      loadLevel(game.levelIndex + 1);
      game.phase = 'playing';
    }
  } else if (game.phase === 'win') {
    if (input.wasPressed('KeyR')) {
      game.score = 0;
      loadLevel(0);
      game.phase = 'playing';
    }
  }
  input.consumePressed();
  render(ctx, game);
  requestAnimationFrame(frame);
}

// Screenshot mode: ?shot=1..4 — stage one frozen moment, paint one frame.
const params = new URLSearchParams(window.location.search);
const shot = Number(params.get('shot') || 0);
if (shot >= 1 && shot <= 4) {
  game.score = 0;
  loadLevel(0);
  stageShot(shot, game);
  updateWatchers(0);
  rebuildCones();
  render(ctx, game);
  document.title = `THE MIDNIGHT LEDGER — shot ${shot}`;
} else {
  loadLevel(0);
  game.phase = 'title';
  requestAnimationFrame(frame);
}

// Exposed for play-testing in the console.
window.__game = game;
