// shots.js — one job: stage the four screenshots from the game's own state.
// Each shot picks a level, places the thief, the guards and the cameras in a
// chosen moment, and sets the HUD numbers — then the renderer paints exactly
// one frame. No pixels are ever edited; every shot is a real render.
import { TILE } from './config.js';

function placeGuard(game, i, tx, ty, angleDeg, state, suspicion) {
  const g = game.guards[i];
  if (!g) return;
  g.x = (tx + 0.5) * TILE;
  g.y = (ty + 0.5) * TILE;
  g.angle = (angleDeg * Math.PI) / 180;
  g.state = state;
  g.suspicion = suspicion;
  g.waitTimer = 0;
  g.stateTimer = 0;
}

function placePlayer(game, tx, ty) {
  game.player.x = (tx + 0.5) * TILE;
  game.player.y = (ty + 0.5) * TILE;
}

function ring(game, tx, ty, radius, maxRadius) {
  game.noiseRings.push({ x: (tx + 0.5) * TILE, y: (ty + 0.5) * TILE, radius, maxRadius, heardBy: new Set() });
}

// Shot 1 — the cover. The Counting Floor, a near-miss recovery: the thief is
// hidden in a planter while a guard who half-saw them sweeps the room with a
// "?" over its head, alarm at 38, a noise ring still fading, cameras sweeping,
// the Gilt Key and the exit both in frame.
function shotCover(game) {
  game.levelIndex = 0;
  game.loadLevel(0);
  placePlayer(game, 5, 3); // inside the planter at row 3
  game.player.crouched = true;
  game.player.hidden = true;
  game.player.visibility = 0;
  placeGuard(game, 0, 8, 2, 70, 'suspicious', 46);
  placeGuard(game, 1, 13, 8, 180, 'patrol', 0);
  placeGuard(game, 2, 16, 16, -90, 'patrol', 0);
  game.alarm = 38;
  game.detection = 'SUSPICIOUS';
  game.timeLeft = 187;
  game.player.loot = 150;
  game.player.lootCount = 3;
  game.player.coins = 2;
  game.player.matches = 3;
  ring(game, 9, 5, 92, 185);
  game.banner = null;
}

// Shot 2 — the caught moment. The Vault, alarm at 78: a guard has the thief
// in its red cone and is giving chase, lasers live, a camera spotting.
function shotAlarm(game) {
  game.levelIndex = 1;
  game.loadLevel(1);
  placePlayer(game, 12, 9);
  game.player.sprinting = true;
  game.player.visibility = 1;
  game.player.lit = true;
  placeGuard(game, 0, 10, 9, 0, 'chase', 100);
  placeGuard(game, 1, 5, 15, -70, 'search', 55);
  placeGuard(game, 2, 18, 5, 160, 'suspicious', 40);
  game.alarm = 78;
  game.detection = 'ALARM';
  game.spottedThisLevel = true;
  game.ghost = false;
  game.timeLeft = 211;
  game.player.loot = 250;
  game.player.lootCount = 4;
  game.player.coins = 1;
  game.player.matches = 2;
  ring(game, 12, 9, 130, 185);
  game.banner = { text: 'SPOTTED!', sub: 'Break line of sight — the alarm fades when you are unseen', color: '#ff5040' };
  for (const laser of game.lasers) laser.on = true;
}

// Shot 3 — the vault crack. The dial is mid-spin with the needle inside the
// gold arc, two tumblers already set, the Ledger glowing behind the vault door.
function shotVault(game) {
  game.levelIndex = 1;
  game.loadLevel(1);
  placePlayer(game, 10, 6); // at the vault-room door
  game.player.visibility = 0.45;
  placeGuard(game, 0, 6, 8, -50, 'patrol', 0);
  placeGuard(game, 1, 17, 15, 90, 'patrol', 0);
  placeGuard(game, 2, 19, 3, 140, 'patrol', 0);
  game.alarm = 12;
  game.detection = 'UNSEEN';
  game.timeLeft = 243;
  game.player.loot = 200;
  game.player.lootCount = 3;
  game.player.coins = 3;
  game.player.matches = 3;
  game.phase = 'crack';
  game.crack = {
    angle: -0.5,
    zoneStart: -0.9,
    zoneWidth: 0.8,
    tumblers: 2,
    speed: 2.2,
  };
  game.banner = null;
}

// Shot 4 — the getaway. The Rooftop, exit unlocked, the thief at the zip-line
// with the take, searchlights sweeping, GHOST intact.
function shotEscape(game) {
  game.levelIndex = 2;
  game.loadLevel(2);
  placePlayer(game, 11, 17);
  game.player.hasObjective = true;
  game.player.visibility = 0.45;
  game.level.objective.taken = true;
  game.level.exit.open = true;
  placeGuard(game, 0, 5, 3, 60, 'patrol', 0);
  placeGuard(game, 1, 18, 10, -120, 'patrol', 0);
  placeGuard(game, 2, 8, 15, 20, 'patrol', 0);
  placeGuard(game, 3, 13, 8, -60, 'patrol', 0);
  game.alarm = 0;
  game.detection = 'UNSEEN';
  game.ghost = true;
  game.timeLeft = 96;
  game.player.loot = 450;
  game.player.lootCount = 6;
  game.player.coins = 2;
  game.player.matches = 1;
  game.banner = { text: 'EXIT UNLOCKED', sub: 'GHOST — never spotted · ride the zip-line out', color: '#58d68d' };
}

export function stageShot(n, game) {
  game.time = 12.34; // fixed clock so every sweep and flicker is deterministic
  game.score = n === 4 ? 1450 : n === 2 ? 250 : n === 3 ? 200 : 150;
  game.noiseRings = [];
  game.noiseLevel = n === 2 ? 0.8 : n === 1 ? 0.45 : 0.1;
  if (n === 1) shotCover(game);
  else if (n === 2) shotAlarm(game);
  else if (n === 3) shotVault(game);
  else if (n === 4) shotEscape(game);
  else shotCover(game);
  game.phase = game.phase === 'crack' ? 'crack' : 'playing';
  game.blink = true;
}
