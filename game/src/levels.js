// levels.js — one job: the three heists. Each level is an ASCII map plus
// patrol routes, cameras, searchlights and laser gates. The map legend:
//   # wall   . floor   r rug   B planter cover (hide)   C crate (blocks sight)
//   L lamp   o small loot ($50)   O big loot ($150)   * objective   X exit
//   P thief start   V vault door (level 2)   G guard start (path in data)
import { TILE } from './config.js';

export const LEVELS = [
  {
    name: 'THE COUNTING FLOOR',
    sub: 'Heist 1 of 3 — Meridian Counting House',
    objectiveName: 'THE GILT KEY',
    objectiveText: 'Steal the Gilt Key, then reach the exit',
    timeLimit: 240,
    map: [
      '########################',
      '#......L.......L.......#',
      '#.P....................#',
      '#....BB....CC....BB....#',
      '#......................#',
      '#.o...####..####...o...#',
      '#......................#',
      '#..CC..........CC......#',
      '#......................#',
      '#....L....*.....L......#',
      '#......................#',
      '#.o...####..####...O...#',
      '#......................#',
      '#..BB..........BB......#',
      '#......................#',
      '#....CC....CC..........#',
      '#.o......L......L..o...#',
      '#......................#',
      '#..........X...........#',
      '########################',
    ],
    guards: [
      { path: [[4, 2], [19, 2], [19, 4], [4, 4]], pause: 1.2 },
      { path: [[3, 8], [20, 8], [20, 11], [3, 11]], pause: 1.0 },
      { path: [[4, 16], [19, 16], [19, 17], [4, 17]], pause: 1.4 },
    ],
    cameras: [
      { tx: 22.5, ty: 1.5, baseDeg: 135, sweepDeg: 55, period: 5.0, phase: 0 },
      { tx: 1.5, ty: 18.5, baseDeg: -45, sweepDeg: 55, period: 6.0, phase: 2.0 },
    ],
    searchlights: [],
    lasers: [],
  },
  {
    name: 'THE VAULT',
    sub: 'Heist 2 of 3 — crack the vault, take the Ledger',
    objectiveName: 'THE BLACK LEDGER',
    objectiveText: 'Crack the vault (E, 3 tumblers), take the Ledger',
    timeLimit: 300,
    map: [
      '########################',
      '#......L.......L.......#',
      '#.P....######..........#',
      '#......#....#....BB....#',
      '#..o...#.V*.#....o.....#',
      '#......#....#..........#',
      '#..CC..###.##..CC......#',
      '#......................#',
      '#.L....####....L.......#',
      '#......................#',
      '#..BB..#....#..BB......#',
      '#......#....#..........#',
      '#......#....#....O.....#',
      '#..o...######....L.....#',
      '#......................#',
      '#....CC....CC....CC....#',
      '#.L....................#',
      '#..BB......o......BB...#',
      '#..........X...........#',
      '########################',
    ],
    guards: [
      { path: [[4, 8], [19, 8], [19, 9], [4, 9]], pause: 1.0 },
      { path: [[3, 15], [20, 15], [20, 16], [3, 16]], pause: 1.2 },
      { path: [[16, 2], [16, 7], [21, 7], [21, 2]], pause: 0.8 },
    ],
    cameras: [
      { tx: 11.5, ty: 7.5, baseDeg: 90, sweepDeg: 70, period: 4.5, phase: 0 },
      { tx: 22.5, ty: 13.5, baseDeg: 180, sweepDeg: 60, period: 5.5, phase: 1.5 },
    ],
    searchlights: [],
    lasers: [
      // Horizontal gate across the middle corridor; toggles off briefly.
      { x1: 5.5, y1: 7.5, x2: 18.5, y2: 7.5, period: 4.0, onTime: 2.6, phase: 0 },
      // Vertical gate guarding the vault antechamber approach.
      { x1: 13.5, y1: 13.5, x2: 13.5, y2: 17.5, period: 5.0, onTime: 3.4, phase: 1.0 },
    ],
  },
  {
    name: 'THE ROOFTOP',
    sub: 'Heist 3 of 3 — the getaway. Reach the zip-line.',
    objectiveName: 'THE GETAWAY CACHE',
    objectiveText: 'Grab the cache, then ride the zip-line out',
    timeLimit: 240,
    map: [
      '########################',
      '#..L.......L.......L...#',
      '#.P....CC......BB......#',
      '#......................#',
      '#..BB....o....CC.......#',
      '#......................#',
      '#....CC......BB........#',
      '#......................#',
      '#.o......L......o......#',
      '#......................#',
      '#..CC....BB....CC......#',
      '#......................#',
      '#.L......o......L......#',
      '#......................#',
      '#....BB......CC........#',
      '#......................#',
      '#.o....CC......BB..o...#',
      '#..................*...#',
      '#..........X...........#',
      '########################',
    ],
    guards: [
      { path: [[3, 3], [20, 3], [20, 5], [3, 5]], pause: 1.0 },
      { path: [[3, 10], [20, 10], [20, 12], [3, 12]], pause: 1.2 },
      { path: [[5, 15], [18, 15], [18, 17], [5, 17]], pause: 1.0 },
      { path: [[11, 6], [11, 14], [14, 14], [14, 6]], pause: 0.8 },
    ],
    cameras: [],
    searchlights: [
      { tx: 1.5, ty: 1.5, baseDeg: 45, sweepDeg: 80, period: 7.0, phase: 0 },
      { tx: 22.5, ty: 1.5, baseDeg: 135, sweepDeg: 80, period: 8.0, phase: 3.0 },
    ],
    lasers: [],
  },
];

// parseLevel turns a LEVELS entry into the runtime objects the game uses.
// Walls, crates and planters become a solid grid; lamps, loot, the objective,
// the exit, the vault and the thief start come out as positioned objects.
export function parseLevel(def) {
  const rows = def.map.length;
  const cols = def.map[0].length;
  const solid = [];
  const blocksSight = [];
  const lamps = [];
  const loot = [];
  const bushes = [];
  let playerStart = { x: 2.5 * TILE, y: 2.5 * TILE };
  let objective = null;
  let exit = null;
  let vault = null;
  for (let y = 0; y < rows; y++) {
    solid.push(new Array(cols).fill(false));
    blocksSight.push(new Array(cols).fill(false));
    for (let x = 0; x < cols; x++) {
      const ch = def.map[y][x];
      const cx = (x + 0.5) * TILE;
      const cy = (y + 0.5) * TILE;
      if (ch === '#') {
        solid[y][x] = true;
        blocksSight[y][x] = true;
      } else if (ch === 'C') {
        solid[y][x] = true;
        blocksSight[y][x] = true;
      } else if (ch === 'B') {
        bushes.push({ tx: x, ty: y, x: cx, y: cy });
        blocksSight[y][x] = true;
      } else if (ch === 'L') {
        lamps.push({ tx: x, ty: y, x: cx, y: cy, lit: true });
      } else if (ch === 'o') {
        loot.push({ x: cx, y: cy, value: 50, taken: false, big: false });
      } else if (ch === 'O') {
        loot.push({ x: cx, y: cy, value: 150, taken: false, big: true });
      } else if (ch === '*') {
        objective = { x: cx, y: cy, taken: false, name: def.objectiveName };
      } else if (ch === 'X') {
        exit = { x: cx, y: cy, open: false };
      } else if (ch === 'P') {
        playerStart = { x: cx, y: cy };
      } else if (ch === 'V') {
        vault = { x: cx, y: cy, cracked: false, tumblers: 0 };
      }
    }
  }
  return {
    def,
    rows,
    cols,
    solid,
    blocksSight,
    lamps,
    loot,
    bushes,
    playerStart,
    objective,
    exit,
    vault,
  };
}
