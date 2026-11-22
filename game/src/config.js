// config.js — one job: every tunable number for THE MIDNIGHT LEDGER.
// No game logic here, only constants the other files read.
export const TILE = 40;
export const COLS = 24;
export const ROWS = 20;
export const PLAY_W = COLS * TILE; // 960
export const PANEL_W = 320;
export const VIEW_W = PLAY_W + PANEL_W; // 1280
export const VIEW_H = ROWS * TILE; // 800

export const PLAYER_R = 13;
export const PLAYER_WALK = 150; // px per second
export const PLAYER_SPRINT = 235;
export const PLAYER_CROUCH = 85;

export const GUARD_R = 14;
export const GUARD_PATROL_SPEED = 62;
export const GUARD_SEARCH_SPEED = 95;
export const GUARD_CHASE_SPEED = 165;

export const CONE_RANGE_LIT = 185;
export const CONE_RANGE_SHADOW = 105;
export const CONE_HALF_ANGLE = 0.58; // radians, ~33 degrees each side
export const CAMERA_RANGE = 210;
export const SEARCHLIGHT_RANGE = 260;

export const SUSPICION_RATE = 55; // per second while fully seen
export const SUSPICION_DECAY = 22;
export const ALARM_RISE = 26; // per second while chased / camera-spotted
export const ALARM_DECAY = 9;

export const LAMP_RADIUS = 130;
export const LAMP_DOUSE_RANGE = 58;

export const COIN_COUNT = 3;
export const COIN_THROW_RANGE = 260;
export const COIN_RING_RADIUS = 185;
export const MATCH_COUNT = 3;

export const NOISE_SPRINT_INTERVAL = 0.38;
export const NOISE_SPRINT_RADIUS = 130;

export const LASER_ALARM_HIT = 34;

export const VAULT_TUMBLERS = 3;

// Palette: midnight bank hall — deep blue-charcoal, warm brass, teal-gold.
export const COLORS = {
  floorDark: '#171a24',
  floorLight: '#1d212e',
  floorLit: '#262a38',
  rug: '#3a2b33',
  rugEdge: '#6b4a3a',
  wall: '#0d0f16',
  wallTop: '#2c3040',
  wallTrim: '#8a6d3b',
  bush: '#1e4d2e',
  bushEdge: '#3f8a4f',
  crate: '#4a3a26',
  crateEdge: '#8a6d3b',
  lampGlow: 'rgba(255, 190, 90, 0.16)',
  lampCore: '#ffd27a',
  coneGuard: 'rgba(255, 214, 90, 0.20)',
  coneGuardEdge: 'rgba(255, 214, 90, 0.55)',
  coneAlert: 'rgba(255, 70, 60, 0.28)',
  coneAlertEdge: 'rgba(255, 70, 60, 0.75)',
  coneCamera: 'rgba(90, 170, 255, 0.20)',
  coneCameraEdge: 'rgba(90, 170, 255, 0.55)',
  coneLight: 'rgba(255, 240, 180, 0.16)',
  laser: 'rgba(255, 60, 70, 0.85)',
  loot: '#ffd24a',
  lootBig: '#ff9d2e',
  objective: '#7fe7ff',
  exit: '#58d68d',
  exitLocked: '#5a6b7a',
  player: '#e8e4d8',
  playerCrouch: '#b8c4a8',
  guard: '#c94f43',
  guardCalm: '#d8b25a',
  panel: '#10131c',
  panelEdge: '#2c3040',
  text: '#e8e4d8',
  textDim: '#9aa3b5',
  gold: '#d8b25a',
  red: '#ff5040',
  green: '#58d68d',
};
