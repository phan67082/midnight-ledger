// audio.js — one job: tiny synthesized sounds, no audio files.
// WebAudio oscillators only; every call is guarded so a missing audio
// context can never break the game.
let ctx = null;

function audio() {
  if (ctx) return ctx;
  try {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
    return ctx;
  } catch (err) {
    return null;
  }
}

export function unlockAudio() {
  const ac = audio();
  if (ac && ac.state === 'suspended') ac.resume().catch(() => {});
}

function tone(freq, dur, type, gain, when = 0, slideTo = 0) {
  const ac = audio();
  if (!ac) return;
  try {
    const t0 = ac.currentTime + when;
    const osc = ac.createOscillator();
    const g = ac.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t0);
    if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, t0 + dur);
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(gain, t0 + 0.015);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    osc.connect(g);
    g.connect(ac.destination);
    osc.start(t0);
    osc.stop(t0 + dur + 0.05);
  } catch (err) {
    // Sound is garnish; never let it fail the game.
  }
}

export const sfx = {
  step() { tone(190, 0.05, 'triangle', 0.03); },
  coin() { tone(1320, 0.12, 'sine', 0.06); tone(1760, 0.18, 'sine', 0.05, 0.07); },
  clink() { tone(2400, 0.08, 'square', 0.035); tone(1800, 0.1, 'square', 0.03, 0.05); },
  douse() { tone(420, 0.25, 'sawtooth', 0.04, 0, 120); },
  spotted() { tone(220, 0.3, 'sawtooth', 0.09, 0, 440); tone(330, 0.3, 'sawtooth', 0.07, 0.12, 660); },
  alarm() { tone(520, 0.5, 'square', 0.05, 0, 260); },
  pickup() { tone(880, 0.1, 'sine', 0.06); tone(1174, 0.16, 'sine', 0.06, 0.08); },
  objective() { tone(523, 0.14, 'sine', 0.07); tone(659, 0.14, 'sine', 0.07, 0.12); tone(784, 0.3, 'sine', 0.07, 0.24); },
  crack() { tone(1500, 0.07, 'square', 0.05); },
  crackFail() { tone(300, 0.2, 'sawtooth', 0.06, 0, 140); },
  vaultOpen() { tone(392, 0.2, 'sine', 0.07); tone(523, 0.2, 'sine', 0.07, 0.15); tone(659, 0.4, 'sine', 0.07, 0.3); },
  caught() { tone(160, 0.6, 'sawtooth', 0.1, 0, 60); },
  clear() { tone(523, 0.16, 'sine', 0.07); tone(659, 0.16, 'sine', 0.07, 0.14); tone(784, 0.16, 'sine', 0.07, 0.28); tone(1046, 0.4, 'sine', 0.08, 0.42); },
};
