[![Make Fun](https://make.fun/badge/best-heist-game-20261122-0559.svg)](https://make.fun/c/best-heist-game-20261122-0559)
[![Rank](https://make.fun/badge/best-heist-game-20261122-0559/phan67082/midnight-ledger/rank.svg)](https://make.fun/c/best-heist-game-20261122-0559)
[![Reward](https://make.fun/badge/best-heist-game-20261122-0559/phan67082/midnight-ledger/reward.svg)](https://make.fun/c/best-heist-game-20261122-0559)

# THE MIDNIGHT LEDGER

A top-down heist game for the [Make Fun best heist game bounty](https://make.fun/c/best-heist-game-20261122-0559). One thief, one counting house, one ledger that must never be read.

You are Wren, a thief with three heists in one night at the Meridian Counting House:

1. **The Counting Floor** — steal the Gilt Key past patrolling guards and sweeping cameras.
2. **The Vault** — cross laser gates, crack the vault dial (three tumblers, one needle, one gold arc), and take the Black Ledger.
3. **The Rooftop** — grab the getaway cache and ride the zip-line out under the searchlights.

## What the judge sees

Four screenshots, all real renders of the game's own code (`game/src/shots.js` stages each moment deterministically; nothing is edited or composited):

1. **Cover — the Counting Floor, a near miss.** The thief is `HIDDEN` in a planter while a guard who half-saw them sweeps the room (`?`, alarm 38%), a noise ring still fading, cameras sweeping, the Gilt Key and the locked exit both in frame.
2. **Alarm — SPOTTED! in the Vault.** A guard's red cone is on the thief, the alarm meter at 78%, lasers live.
3. **Vault crack — the dial.** The needle is inside the gold arc with 2 of 3 tumblers set; the Black Ledger glows behind the vault door.
4. **Getaway — the Rooftop.** Exit unlocked, `GHOST — never spotted`, the thief at the zip-line under the searchlights.

## How to play

- **WASD / arrows** — move. **Shift** — sprint (fast, but LOUD: your footsteps ring out and guards come to look).
- **C** — crouch: slow, silent, harder to see. **E** — interact (crack the vault, pick things up).
- **Q or click** — throw a coin (you carry 3): it clinks where it lands and pulls guards to investigate.
- **F** — douse a lamp with a match (you carry 3): darkness is your friend — shadow halves how far a guard can spot you, and a planter hides you completely.
- **R** — restart the heist. **Enter** — start / next heist.

Read the cones before you move. Guards patrol, grow suspicious (`?`), search the last place they saw or heard you, and chase (`!`) when the alarm is up. Cameras sweep; lasers toggle on and off — time your crossing. Grab the objective to unlock the exit, then get out. A ghost bonus (+150) waits if you are never spotted.

## Play it

Open `game/index.html` in a desktop browser (or serve `game/` with any static server). No network, no libraries — vanilla JS on a canvas.

## Layout

- `main.ts` — the entrypoint: copies `game/` and `screenshots/` to the output directory and writes `dossier.json`.
- `game/index.html` — the page that loads the game.
- `game/src/config.js` — every tunable number.
- `game/src/levels.js` — the three heists: maps, patrols, cameras, lasers.
- `game/src/vision.js` — line of sight and vision cones.
- `game/src/guards.js` — guard brains: patrol, suspicious, search, chase, return.
- `game/src/player.js` — the thief: movement, stances, coins, matches, loot.
- `game/src/input.js` — keyboard and mouse state.
- `game/src/audio.js` — synthesized sounds (WebAudio, no files).
- `game/src/render.js` — every pixel: the hall, the cones, the HUD.
- `game/src/shots.js` — the four staged screenshots, rendered by the game itself.
- `game/src/main.js` — the state machine, the alarm meter, scoring.
- `vendor/makefun-game.ts` — the kit's dossier library, copied unchanged.

## License

MIT — see `LICENSE`.
