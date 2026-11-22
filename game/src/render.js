// render.js — one job: paint every frame. Floor, walls and dressing, lamp
// glow, vision cones, lasers, loot, the thief, the guards, noise rings,
// the HUD panel, banners and the overlays. Pure drawing from game state —
// no logic, no randomness except a fixed hash for wall dressing.
import { TILE, COLS, ROWS, PLAY_W, PANEL_W, VIEW_W, VIEW_H, COLORS, LAMP_RADIUS } from './config.js';
import { conePolygon } from './vision.js';

// Fixed hash: same tile always gets the same dressing.
function hash2(x, y, seed) {
  let h = (x * 374761393 + y * 668265263 + seed * 974634) | 0;
  h = (h ^ (h >> 13)) | 0;
  h = Math.imul(h, 1274126177);
  h = (h ^ (h >> 16)) >>> 0;
  return h / 4294967295;
}

function bar(ctx, x, y, w, h, frac, color, bg) {
  ctx.fillStyle = bg || '#232839';
  ctx.fillRect(x, y, w, h);
  ctx.fillStyle = color;
  ctx.fillRect(x, y, Math.max(0, Math.min(1, frac)) * w, h);
  ctx.strokeStyle = 'rgba(255,255,255,0.18)';
  ctx.strokeRect(x + 0.5, y + 0.5, w, h);
}

function drawFloor(ctx, game) {
  const { level } = game;
  for (let y = 0; y < ROWS; y++) {
    for (let x = 0; x < COLS; x++) {
      const px = x * TILE;
      const py = y * TILE;
      const ch = level.def.map[y][x];
      const lit = isLitTile(level, x, y);
      ctx.fillStyle = lit ? COLORS.floorLit : ((x + y) % 2 === 0 ? COLORS.floorDark : COLORS.floorLight);
      ctx.fillRect(px, py, TILE, TILE);
      if (ch === 'r') {
        ctx.fillStyle = COLORS.rug;
        ctx.fillRect(px + 4, py + 4, TILE - 8, TILE - 8);
        ctx.strokeStyle = COLORS.rugEdge;
        ctx.strokeRect(px + 7.5, py + 7.5, TILE - 15, TILE - 15);
      }
      // Faint grout grid.
      ctx.strokeStyle = 'rgba(255,255,255,0.03)';
      ctx.strokeRect(px + 0.5, py + 0.5, TILE, TILE);
    }
  }
  // Woven rugs in the open halls.
  drawRug(ctx, game, 3, 6, 5, 3);
  drawRug(ctx, game, 15, 13, 5, 3);
}

function isLitTile(level, x, y) {
  const cx = (x + 0.5) * TILE;
  const cy = (y + 0.5) * TILE;
  for (const lamp of level.lamps) {
    if (!lamp.lit) continue;
    if (Math.hypot(cx - lamp.x, cy - lamp.y) < LAMP_RADIUS) return true;
  }
  return false;
}

function drawRug(ctx, game, tx, ty, w, h) {
  // Paint only over plain floor tiles, never over crates, planters or loot.
  const level = game.level;
  for (let y = ty; y < ty + h; y++) {
    for (let x = tx; x < tx + w; x++) {
      if (level.def.map[y][x] !== '.') continue;
      ctx.fillStyle = COLORS.rug;
      ctx.fillRect(x * TILE + 4, y * TILE + 4, TILE - 8, TILE - 8);
    }
  }
  const px = tx * TILE;
  const py = ty * TILE;
  ctx.strokeStyle = COLORS.rugEdge;
  ctx.lineWidth = 2;
  ctx.strokeRect(px + 10.5, py + 10.5, w * TILE - 21, h * TILE - 21);
  ctx.lineWidth = 1;
  ctx.strokeStyle = 'rgba(216,178,90,0.35)';
  ctx.beginPath();
  ctx.moveTo(px + 14, py + h * TILE / 2);
  ctx.lineTo(px + w * TILE - 14, py + h * TILE / 2);
  ctx.moveTo(px + w * TILE / 2, py + 14);
  ctx.lineTo(px + w * TILE / 2, py + h * TILE - 14);
  ctx.stroke();
}

function drawWalls(ctx, game) {
  const { level } = game;
  for (let y = 0; y < ROWS; y++) {
    for (let x = 0; x < COLS; x++) {
      const ch = level.def.map[y][x];
      if (ch !== '#') continue;
      const px = x * TILE;
      const py = y * TILE;
      ctx.fillStyle = COLORS.wall;
      ctx.fillRect(px, py, TILE, TILE);
      ctx.fillStyle = COLORS.wallTop;
      ctx.fillRect(px, py, TILE, 6);
      ctx.strokeStyle = 'rgba(0,0,0,0.5)';
      ctx.strokeRect(px + 0.5, py + 0.5, TILE, TILE);
      // Dressing on long wall runs: paintings, shelves, sconces.
      const h = hash2(x, y, game.levelIndex + 1);
      const below = y + 1 < ROWS ? level.def.map[y + 1][x] : '#';
      if (below !== '#' && h < 0.35) {
        // Gilt painting.
        ctx.fillStyle = '#2a2118';
        ctx.fillRect(px + 8, py + 10, 24, 18);
        ctx.strokeStyle = COLORS.gold;
        ctx.strokeRect(px + 8.5, py + 10.5, 24, 18);
        ctx.fillStyle = h < 0.18 ? '#7a5a2e' : '#3a4a5a';
        ctx.fillRect(px + 12, py + 14, 16, 10);
      } else if (below !== '#' && h < 0.55) {
        // Bookshelf slats.
        ctx.fillStyle = '#241a12';
        ctx.fillRect(px + 6, py + 8, 28, 24);
        ctx.fillStyle = '#5a4028';
        ctx.fillRect(px + 8, py + 12, 24, 3);
        ctx.fillRect(px + 8, py + 20, 24, 3);
      }
    }
  }
}

function drawBushesAndCrates(ctx, game) {
  const { level } = game;
  for (const b of level.bushes) {
    ctx.fillStyle = COLORS.bush;
    ctx.beginPath();
    ctx.arc(b.x, b.y, 17, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = COLORS.bushEdge;
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.lineWidth = 1;
    ctx.fillStyle = '#2e6b3e';
    ctx.beginPath();
    ctx.arc(b.x - 6, b.y - 5, 6, 0, Math.PI * 2);
    ctx.arc(b.x + 7, b.y + 4, 5, 0, Math.PI * 2);
    ctx.fill();
  }
  for (let y = 0; y < ROWS; y++) {
    for (let x = 0; x < COLS; x++) {
      if (level.def.map[y][x] !== 'C') continue;
      const px = x * TILE;
      const py = y * TILE;
      ctx.fillStyle = COLORS.crate;
      ctx.fillRect(px + 3, py + 3, TILE - 6, TILE - 6);
      ctx.strokeStyle = COLORS.crateEdge;
      ctx.strokeRect(px + 3.5, py + 3.5, TILE - 7, TILE - 7);
      ctx.beginPath();
      ctx.moveTo(px + 3, py + 3);
      ctx.lineTo(px + TILE - 3, py + TILE - 3);
      ctx.moveTo(px + TILE - 3, py + 3);
      ctx.lineTo(px + 3, py + TILE - 3);
      ctx.stroke();
    }
  }
}

function drawLamps(ctx, game) {
  const { level } = game;
  for (const lamp of level.lamps) {
    if (lamp.lit) {
      const grad = ctx.createRadialGradient(lamp.x, lamp.y, 4, lamp.x, lamp.y, LAMP_RADIUS);
      grad.addColorStop(0, 'rgba(255, 205, 110, 0.20)');
      grad.addColorStop(1, 'rgba(255, 205, 110, 0)');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(lamp.x, lamp.y, LAMP_RADIUS, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = COLORS.lampCore;
      ctx.beginPath();
      ctx.arc(lamp.x, lamp.y, 6, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#8a6d3b';
      ctx.beginPath();
      ctx.arc(lamp.x, lamp.y, 9, 0, Math.PI * 2);
      ctx.stroke();
    } else {
      // Doused lamp: cold brass, a wisp of smoke.
      ctx.fillStyle = '#4a4030';
      ctx.beginPath();
      ctx.arc(lamp.x, lamp.y, 6, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = 'rgba(200,200,200,0.35)';
      ctx.beginPath();
      ctx.moveTo(lamp.x, lamp.y - 6);
      ctx.quadraticCurveTo(lamp.x + 4, lamp.y - 14, lamp.x - 2, lamp.y - 20);
      ctx.stroke();
    }
  }
}

function drawCones(ctx, game) {
  for (const cone of game.cones) {
    const poly = conePolygon(game.level, cone.x, cone.y, cone.angle, cone.halfAngle, cone.range);
    ctx.beginPath();
    ctx.moveTo(poly[0].x, poly[0].y);
    for (let i = 1; i < poly.length; i++) ctx.lineTo(poly[i].x, poly[i].y);
    ctx.closePath();
    if (cone.kind === 'camera' || cone.kind === 'light') {
      ctx.fillStyle = cone.alert ? COLORS.coneAlert : COLORS.coneCamera;
      ctx.strokeStyle = cone.alert ? COLORS.coneAlertEdge : COLORS.coneCameraEdge;
    } else {
      ctx.fillStyle = cone.alert ? COLORS.coneAlert : COLORS.coneGuard;
      ctx.strokeStyle = cone.alert ? COLORS.coneAlertEdge : COLORS.coneGuardEdge;
    }
    ctx.fill();
    ctx.stroke();
  }
}

function drawLasers(ctx, game) {
  for (const laser of game.lasers) {
    if (!laser.on) continue;
    const pulse = 0.6 + 0.4 * Math.sin(game.time * 6 + laser.phase);
    ctx.strokeStyle = `rgba(255, 60, 70, ${0.55 + 0.35 * pulse})`;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(laser.x1, laser.y1);
    ctx.lineTo(laser.x2, laser.y2);
    ctx.stroke();
    ctx.lineWidth = 1;
    ctx.fillStyle = '#ff5040';
    ctx.beginPath();
    ctx.arc(laser.x1, laser.y1, 5, 0, Math.PI * 2);
    ctx.arc(laser.x2, laser.y2, 5, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawItems(ctx, game) {
  const { level, time } = game;
  const bob = Math.sin(time * 2.4) * 2;
  for (const item of level.loot) {
    if (item.taken) continue;
    ctx.fillStyle = item.big ? COLORS.lootBig : COLORS.loot;
    ctx.beginPath();
    ctx.arc(item.x, item.y + bob, item.big ? 9 : 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = 'rgba(0,0,0,0.5)';
    ctx.stroke();
    if (item.big) {
      ctx.fillStyle = '#fff2c8';
      ctx.font = 'bold 10px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('$', item.x, item.y + bob);
    }
  }
  const obj = level.objective;
  if (obj && !obj.taken) {
    const glow = 0.5 + 0.3 * Math.sin(time * 3);
    ctx.fillStyle = `rgba(127, 231, 255, ${glow})`;
    ctx.beginPath();
    ctx.arc(obj.x, obj.y, 16, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = COLORS.objective;
    ctx.beginPath();
    ctx.moveTo(obj.x, obj.y - 10 + bob);
    ctx.lineTo(obj.x + 7, obj.y - 2 + bob);
    ctx.lineTo(obj.x, obj.y + 10 + bob);
    ctx.lineTo(obj.x - 7, obj.y - 2 + bob);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = COLORS.text;
    ctx.font = 'bold 10px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(obj.name, obj.x, obj.y - 24);
  }
  if (level.vault) {
    const v = level.vault;
    ctx.fillStyle = v.cracked ? '#3a5a4a' : '#4a4a55';
    ctx.fillRect(v.x - 18, v.y - 18, 36, 36);
    ctx.strokeStyle = COLORS.gold;
    ctx.lineWidth = 2;
    ctx.strokeRect(v.x - 18.5, v.y - 18.5, 36, 36);
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(v.x, v.y, 9, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = COLORS.text;
    ctx.font = 'bold 9px sans-serif';
    ctx.textAlign = 'center';
    // The dial covers the vault while cracking, so the label steps aside then.
    if (game.phase !== 'crack') ctx.fillText(v.cracked ? 'OPEN' : 'VAULT', v.x, v.y + 30);
  }
  const exit = level.exit;
  if (exit) {
    const open = exit.open;
    ctx.fillStyle = open ? COLORS.exit : COLORS.exitLocked;
    ctx.globalAlpha = open ? 0.9 : 0.55;
    ctx.fillRect(exit.x - 18, exit.y - 18, 36, 36);
    ctx.globalAlpha = 1;
    ctx.strokeStyle = open ? '#c8ffe0' : '#8a9aa8';
    ctx.lineWidth = 2;
    ctx.strokeRect(exit.x - 18.5, exit.y - 18.5, 36, 36);
    ctx.lineWidth = 1;
    ctx.fillStyle = '#0d0f16';
    ctx.font = 'bold 11px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(open ? 'EXIT' : 'LOCK', exit.x, exit.y + 4);
    if (open) {
      ctx.fillStyle = COLORS.exit;
      ctx.font = 'bold 11px sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText('EXIT UNLOCKED', exit.x + 26, exit.y + 4);
    }
  }
}

function drawGuards(ctx, game) {
  for (const g of game.guards) {
    const alert = g.state === 'chase';
    const hot = g.suspicion >= 35;
    ctx.fillStyle = alert ? COLORS.guard : COLORS.guardCalm;
    ctx.beginPath();
    ctx.arc(g.x, g.y, 14, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = 'rgba(0,0,0,0.6)';
    ctx.stroke();
    // Facing tick.
    ctx.strokeStyle = '#0d0f16';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(g.x, g.y);
    ctx.lineTo(g.x + Math.cos(g.angle) * 16, g.y + Math.sin(g.angle) * 16);
    ctx.stroke();
    ctx.lineWidth = 1;
    // State mark.
    ctx.font = 'bold 16px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    if (alert) {
      ctx.fillStyle = COLORS.red;
      ctx.fillText('!', g.x, g.y - 24);
    } else if (hot) {
      ctx.fillStyle = '#ffd24a';
      ctx.fillText('?', g.x, g.y - 24);
    }
    // Suspicion arc over the guard.
    if (g.suspicion > 2) {
      ctx.strokeStyle = alert ? COLORS.red : '#ffd24a';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(g.x, g.y, 19, -Math.PI / 2, -Math.PI / 2 + (g.suspicion / 100) * Math.PI * 2);
      ctx.stroke();
      ctx.lineWidth = 1;
    }
  }
  // Cameras and searchlights: brass housing + lens.
  for (const w of game.watchers) {
    ctx.fillStyle = '#3a3f4a';
    ctx.beginPath();
    ctx.arc(w.x, w.y, 9, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = w.spotting ? COLORS.red : COLORS.gold;
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.lineWidth = 1;
    ctx.fillStyle = w.spotting ? COLORS.red : '#7fd4ff';
    ctx.beginPath();
    ctx.arc(w.x + Math.cos(w.angle) * 5, w.y + Math.sin(w.angle) * 5, 3, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawPlayer(ctx, game) {
  const p = game.player;
  const bob = p.moving && !p.crouched ? Math.sin(p.stepPhase * 0.12) * 1.5 : 0;
  // Shadow ring under the thief: lit or in shadow.
  ctx.strokeStyle = p.lit ? 'rgba(255, 210, 122, 0.7)' : 'rgba(140, 200, 255, 0.45)';
  ctx.beginPath();
  ctx.arc(p.x, p.y, 17, 0, Math.PI * 2);
  ctx.stroke();
  ctx.fillStyle = p.crouched ? COLORS.playerCrouch : COLORS.player;
  ctx.beginPath();
  ctx.arc(p.x, p.y + bob, p.crouched ? 11 : 13, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#0d0f16';
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.lineWidth = 1;
  // Brim of the thief's hat.
  ctx.strokeStyle = '#3a2f22';
  ctx.beginPath();
  ctx.arc(p.x, p.y + bob, 8, 0, Math.PI * 2);
  ctx.stroke();
  if (p.hidden) {
    ctx.fillStyle = COLORS.green;
    ctx.font = 'bold 10px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('HIDDEN', p.x, p.y - 24);
  } else if (p.crouched) {
    ctx.fillStyle = COLORS.textDim;
    ctx.font = 'bold 10px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('CROUCHED', p.x, p.y - 24);
  }
}

function drawNoiseRings(ctx, game) {
  for (const ring of game.noiseRings) {
    const frac = ring.radius / ring.maxRadius;
    ctx.strokeStyle = `rgba(255, 220, 120, ${0.75 * (1 - frac)})`;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(ring.x, ring.y, ring.radius, 0, Math.PI * 2);
    ctx.stroke();
    ctx.lineWidth = 1;
  }
}

function drawTopBar(ctx, game) {
  ctx.fillStyle = 'rgba(10, 12, 18, 0.82)';
  ctx.fillRect(0, 0, VIEW_W, 34);
  ctx.fillStyle = COLORS.gold;
  ctx.font = 'bold 13px Georgia, serif';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText('THE MIDNIGHT LEDGER', 12, 18);
  ctx.fillStyle = COLORS.text;
  ctx.font = '12px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(`${game.def.name}  ·  ${game.def.objectiveText}`, PLAY_W / 2, 18);
  const mins = Math.floor(Math.max(0, game.timeLeft) / 60);
  const secs = Math.floor(Math.max(0, game.timeLeft) % 60);
  const lowTime = game.timeLeft < 30;
  ctx.fillStyle = lowTime ? COLORS.red : COLORS.text;
  ctx.font = 'bold 14px sans-serif';
  ctx.textAlign = 'right';
  ctx.fillText(`${mins}:${String(secs).padStart(2, '0')}`, VIEW_W - 14, 18);
}

function drawPanel(ctx, game) {
  const x0 = PLAY_W;
  ctx.fillStyle = COLORS.panel;
  ctx.fillRect(x0, 0, PANEL_W, VIEW_H);
  ctx.strokeStyle = COLORS.panelEdge;
  ctx.beginPath();
  ctx.moveTo(x0 + 0.5, 0);
  ctx.lineTo(x0 + 0.5, VIEW_H);
  ctx.stroke();
  let y = 48;
  const px = x0 + 16;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';

  ctx.fillStyle = COLORS.gold;
  ctx.font = 'bold 15px Georgia, serif';
  ctx.fillText(game.def.name, px, y);
  y += 18;
  ctx.fillStyle = COLORS.textDim;
  ctx.font = '11px sans-serif';
  ctx.fillText(game.def.sub, px, y);
  y += 26;

  // Detection state chip.
  const det = game.detection;
  const detColor = det === 'ALARM' ? COLORS.red : det === 'UNSEEN' ? COLORS.green : det === 'SUSPICIOUS' ? '#ffd24a' : '#ff9d2e';
  ctx.fillStyle = detColor;
  ctx.fillRect(px, y - 13, 10, 10);
  ctx.fillStyle = COLORS.text;
  ctx.font = 'bold 14px sans-serif';
  ctx.fillText(det, px + 18, y);
  y += 26;

  ctx.fillStyle = COLORS.textDim;
  ctx.font = '11px sans-serif';
  ctx.fillText('ALARM', px, y);
  y += 6;
  bar(ctx, px, y, PANEL_W - 32, 12, game.alarm / 100, game.alarm > 60 ? COLORS.red : '#ff9d2e');
  y += 28;
  ctx.fillText('VISIBILITY', px, y);
  y += 6;
  bar(ctx, px, y, PANEL_W - 32, 10, game.player.visibility, game.player.lit ? '#ffd27a' : '#7fd4ff');
  y += 26;
  ctx.fillText('NOISE', px, y);
  y += 6;
  bar(ctx, px, y, PANEL_W - 32, 10, game.noiseLevel, '#ff9d2e');
  y += 30;

  ctx.fillStyle = COLORS.text;
  ctx.font = 'bold 14px sans-serif';
  ctx.fillText(`LOOT  $${game.player.loot}`, px, y);
  y += 20;
  ctx.fillStyle = COLORS.textDim;
  ctx.font = '12px sans-serif';
  ctx.fillText(`Objective: ${game.player.hasObjective ? '✓ ' + game.def.objectiveName : game.def.objectiveName}`, px, y);
  y += 20;
  ctx.fillText(`Goal: ${game.player.hasObjective ? 'reach the EXIT' : 'steal the objective'}`, px, y);
  y += 20;
  ctx.fillText(`Score: ${game.score}   ·   Ghost: ${game.ghost ? 'YES' : 'NO'}`, px, y);
  y += 28;

  ctx.fillStyle = COLORS.gold;
  ctx.font = 'bold 12px sans-serif';
  ctx.fillText('TOOLS', px, y);
  y += 18;
  ctx.fillStyle = COLORS.text;
  ctx.font = '12px sans-serif';
  ctx.fillText(`Coins (Q / click)  × ${game.player.coins} — throw to distract`, px, y);
  y += 18;
  ctx.fillText(`Matches (F)  × ${game.player.matches} — douse a lamp`, px, y);
  y += 18;
  ctx.fillText(`Crouch (C) — slow, silent, harder to see`, px, y);
  y += 18;
  ctx.fillText(`Sprint (Shift) — fast, LOUD`, px, y);
  y += 28;

  ctx.fillStyle = COLORS.gold;
  ctx.font = 'bold 12px sans-serif';
  ctx.fillText('LEGEND', px, y);
  y += 18;
  ctx.font = '12px sans-serif';
  const legend = [
    ['#ffd24a', 'guard cone — being seen'],
    ['#5aaaff', 'camera / searchlight'],
    ['#ff5040', 'laser — crossing raises alarm'],
    ['#3f8a4f', 'planter — HIDDEN cover'],
    ['#ffd24a', 'gold — loot   ◆ objective'],
    ['#58d68d', 'green — exit (opens after objective)'],
  ];
  for (const [color, text] of legend) {
    ctx.fillStyle = color;
    ctx.fillRect(px, y - 9, 10, 10);
    ctx.fillStyle = COLORS.text;
    ctx.fillText(text, px + 16, y);
    y += 18;
  }
  y += 8;
  ctx.fillStyle = COLORS.textDim;
  ctx.font = '11px sans-serif';
  ctx.fillText('WASD move · E interact · R restart level', px, y);
  y += 16;
  ctx.fillText('Enter start · Esc pause', px, y);
}

function drawVerbStrip(ctx, game) {
  const y = VIEW_H - 26;
  ctx.fillStyle = 'rgba(10, 12, 18, 0.85)';
  ctx.fillRect(0, y, PLAY_W, 26);
  ctx.fillStyle = COLORS.textDim;
  ctx.font = 'bold 12px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('SNEAK  ·  HIDE  ·  DISTRACT  ·  EXTRACT', PLAY_W / 2, y + 13);
  ctx.fillStyle = COLORS.gold;
  ctx.textAlign = 'right';
  ctx.fillText(`HEIST ${game.levelIndex + 1} / 3`, PLAY_W - 12, y + 13);
}

function drawBanner(ctx, game) {
  if (!game.banner) return;
  const b = game.banner;
  ctx.fillStyle = 'rgba(10, 12, 18, 0.78)';
  ctx.fillRect(0, 300, PLAY_W, 110);
  ctx.fillStyle = b.color || COLORS.gold;
  ctx.font = 'bold 44px Georgia, serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(b.text, PLAY_W / 2, 335);
  if (b.sub) {
    ctx.fillStyle = COLORS.text;
    ctx.font = '16px sans-serif';
    ctx.fillText(b.sub, PLAY_W / 2, 378);
  }
}

function drawCrackDial(ctx, game) {
  const c = game.crack;
  if (!c) return;
  const cx = PLAY_W / 2;
  const cy = 400;
  ctx.fillStyle = 'rgba(10, 12, 18, 0.88)';
  ctx.fillRect(cx - 220, cy - 190, 440, 380);
  ctx.strokeStyle = COLORS.gold;
  ctx.strokeRect(cx - 219.5, cy - 189.5, 440, 380);
  ctx.fillStyle = COLORS.gold;
  ctx.font = 'bold 20px Georgia, serif';
  ctx.textAlign = 'center';
  ctx.fillText('CRACK THE VAULT', cx, cy - 150);
  ctx.fillStyle = COLORS.text;
  ctx.font = '14px sans-serif';
  ctx.fillText('Press E when the needle is in the gold arc', cx, cy - 122);
  // Dial.
  ctx.beginPath();
  ctx.arc(cx, cy, 110, 0, Math.PI * 2);
  ctx.fillStyle = '#1a1e2a';
  ctx.fill();
  ctx.strokeStyle = COLORS.panelEdge;
  ctx.lineWidth = 2;
  ctx.stroke();
  // Gold zone.
  ctx.beginPath();
  ctx.moveTo(cx, cy);
  ctx.arc(cx, cy, 110, c.zoneStart, c.zoneStart + c.zoneWidth);
  ctx.closePath();
  ctx.fillStyle = 'rgba(216, 178, 90, 0.45)';
  ctx.fill();
  // Needle.
  ctx.strokeStyle = '#ff5040';
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(cx, cy);
  ctx.lineTo(cx + Math.cos(c.angle) * 100, cy + Math.sin(c.angle) * 100);
  ctx.stroke();
  ctx.lineWidth = 1;
  ctx.fillStyle = COLORS.text;
  ctx.beginPath();
  ctx.arc(cx, cy, 8, 0, Math.PI * 2);
  ctx.fill();
  // Tumbler pips.
  for (let i = 0; i < 3; i++) {
    ctx.fillStyle = i < c.tumblers ? COLORS.green : COLORS.textDim;
    ctx.beginPath();
    ctx.arc(cx - 30 + i * 30, cy + 140, 8, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.fillStyle = COLORS.textDim;
  ctx.font = '12px sans-serif';
  ctx.fillText(`${c.tumblers} / 3 tumblers`, cx, cy + 165);
}

function drawTitle(ctx, game) {
  ctx.fillStyle = 'rgba(8, 10, 16, 0.92)';
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  ctx.fillStyle = COLORS.gold;
  ctx.font = 'bold 64px Georgia, serif';
  ctx.textAlign = 'center';
  ctx.fillText('THE MIDNIGHT', VIEW_W / 2, 240);
  ctx.fillText('LEDGER', VIEW_W / 2, 310);
  ctx.fillStyle = COLORS.text;
  ctx.font = '18px Georgia, serif';
  ctx.fillText('One thief. One counting house. One ledger that must never be read.', VIEW_W / 2, 360);
  ctx.font = '15px sans-serif';
  ctx.fillStyle = COLORS.textDim;
  ctx.fillText('Steal the Gilt Key, crack the vault, take the Black Ledger — and ride the zip-line out before dawn.', VIEW_W / 2, 392);
  ctx.fillStyle = COLORS.text;
  ctx.font = '15px sans-serif';
  ctx.fillText('WASD move · Shift sprint (loud) · C crouch · Q / click throw a coin · F douse a lamp · E interact', VIEW_W / 2, 450);
  ctx.fillText('Read the cones before you move. Shadow hides you. Planters hide you completely.', VIEW_W / 2, 478);
  ctx.fillStyle = COLORS.gold;
  ctx.font = 'bold 20px Georgia, serif';
  ctx.fillText(game.blink ? '— PRESS ENTER TO BEGIN THE HEIST —' : '', VIEW_W / 2, 540);
  ctx.fillStyle = COLORS.textDim;
  ctx.font = '13px sans-serif';
  ctx.fillText('3 heists · guards, cameras, lasers · ghost bonus for never being spotted', VIEW_W / 2, 590);
}

function drawCaught(ctx, game) {
  ctx.fillStyle = 'rgba(20, 4, 6, 0.82)';
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  ctx.fillStyle = COLORS.red;
  ctx.font = 'bold 64px Georgia, serif';
  ctx.textAlign = 'center';
  ctx.fillText('CAUGHT!', VIEW_W / 2, 330);
  ctx.fillStyle = COLORS.text;
  ctx.font = '18px sans-serif';
  ctx.fillText('The alarm went up and the house closed in. The Ledger stays — this time.', VIEW_W / 2, 380);
  ctx.fillStyle = COLORS.gold;
  ctx.font = 'bold 18px sans-serif';
  ctx.fillText('Press R to try the heist again', VIEW_W / 2, 440);
}

function drawClear(ctx, game) {
  ctx.fillStyle = 'rgba(8, 12, 10, 0.88)';
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  ctx.fillStyle = COLORS.green;
  ctx.font = 'bold 52px Georgia, serif';
  ctx.textAlign = 'center';
  ctx.fillText('HEIST COMPLETE', VIEW_W / 2, 300);
  ctx.fillStyle = COLORS.text;
  ctx.font = '18px sans-serif';
  ctx.fillText(`Loot $${game.levelLoot}  ·  Time bonus ${game.levelTimeBonus}  ·  ${game.ghost ? 'GHOST BONUS +150' : 'Spotted — no ghost bonus'}`, VIEW_W / 2, 350);
  ctx.fillStyle = COLORS.gold;
  ctx.font = 'bold 20px sans-serif';
  ctx.fillText(`Level score ${game.levelScore}   ·   Total ${game.score}`, VIEW_W / 2, 395);
  ctx.fillStyle = COLORS.text;
  ctx.font = '16px sans-serif';
  ctx.fillText(game.levelIndex < 2 ? 'Press ENTER for the next heist' : 'Press ENTER to see the take', VIEW_W / 2, 450);
}

function drawWin(ctx, game) {
  ctx.fillStyle = 'rgba(8, 10, 16, 0.94)';
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  ctx.fillStyle = COLORS.gold;
  ctx.font = 'bold 56px Georgia, serif';
  ctx.textAlign = 'center';
  ctx.fillText('THE LEDGER IS YOURS', VIEW_W / 2, 300);
  ctx.fillStyle = COLORS.text;
  ctx.font = '18px sans-serif';
  ctx.fillText('Three heists. One clean getaway. The Meridian Counting House never saw you coming.', VIEW_W / 2, 350);
  ctx.fillStyle = COLORS.gold;
  ctx.font = 'bold 24px sans-serif';
  ctx.fillText(`FINAL TAKE  $${game.score}`, VIEW_W / 2, 410);
  ctx.fillStyle = COLORS.textDim;
  ctx.font = '15px sans-serif';
  ctx.fillText('Press R to run it all again', VIEW_W / 2, 460);
}

export function render(ctx, game) {
  ctx.clearRect(0, 0, VIEW_W, VIEW_H);
  ctx.fillStyle = '#0a0c12';
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  if (game.phase === 'title') {
    drawTitle(ctx, game);
    return;
  }
  drawFloor(ctx, game);
  drawLamps(ctx, game);
  drawCones(ctx, game);
  drawLasers(ctx, game);
  drawBushesAndCrates(ctx, game);
  drawItems(ctx, game);
  drawNoiseRings(ctx, game);
  drawGuards(ctx, game);
  drawPlayer(ctx, game);
  drawPanel(ctx, game);
  drawTopBar(ctx, game);
  drawVerbStrip(ctx, game);
  drawBanner(ctx, game);
  if (game.phase === 'crack') drawCrackDial(ctx, game);
  if (game.phase === 'caught') drawCaught(ctx, game);
  if (game.phase === 'clear') drawClear(ctx, game);
  if (game.phase === 'win') drawWin(ctx, game);
  // Vignette: the room darkens toward the edges, lamps aside.
  const grad = ctx.createRadialGradient(PLAY_W / 2, VIEW_H / 2, VIEW_H * 0.42, PLAY_W / 2, VIEW_H / 2, VIEW_H * 0.85);
  grad.addColorStop(0, 'rgba(0,0,0,0)');
  grad.addColorStop(1, 'rgba(0,0,0,0.28)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, PLAY_W, VIEW_H);
}
