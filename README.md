# THE MERIDIAN JOB — a stealth heist

[![make.fun](https://img.shields.io/badge/make.fun-best%20heist%20game-gold)](https://make.fun/bounty/best-heist-game-20261122-0559)
[![make.fun · best-heist-game-20261122-0559](https://make.fun/badge/best-heist-game-20261122-0559.svg)](https://make.fun/bounty/best-heist-game-20261122-0559?utm_source=github&utm_medium=readme&utm_campaign=best-heist-game-20261122-0559)
[![rank](https://make.fun/badge/best-heist-game-20261122-0559/dandelionz3/makefun-best-heist-game-20261122-0559/rank.svg)](https://make.fun/bounty/best-heist-game-20261122-0559/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=best-heist-game-20261122-0559)
[![reward](https://make.fun/badge/best-heist-game-20261122-0559/dandelionz3/makefun-best-heist-game-20261122-0559/reward.svg)](https://make.fun/bounty/best-heist-game-20261122-0559?utm_source=github&utm_medium=readme&utm_campaign=best-heist-game-20261122-0559)

**Steal the Meridian Diamond. Don't wake the house.**

A complete top-down stealth heist that plays offline in a desktop browser. Three
rooms — a museum gallery, a bank, a casino vault — each one crossed three ways:
the open hall, the cover line, and the far corridor. Guards patrol with cones of
sight, cameras sweep the walls, and one alarm meter decides whether the night ends
in a getaway or a lockdown.

## How to play

- **WASD / arrow keys** — move the thief
- **Shift** — sneak (slower, harder to spot)
- **E** — grab loot, take the diamond, hold by the security panel to kill the cameras
- **Click** — throw a coin; the nearest guard goes to investigate the sound
- **Q** — EMP burst ($150 of your take): cameras dark for 8 seconds, guards dazed
- **R** — smoke pellet: unseen for 4 seconds
- **P** — pause, **M** — mute, **Space** — start / restart

Lift the loot, take the **Meridian Diamond** (tripping its silent alarm), then walk
out the green **GETAWAY** door. Getting spotted fills the alarm; at 100 the doors
seal and the job is over. A guard's touch ends it too. Finish fast and unseen for
time and ghost bonuses.

## The rooms

1. **Job 1 — The Gilded Gallery**: 2 guards, 1 camera. Learn the cones.
2. **Job 2 — The Meridian Bank**: 3 guards, 2 cameras. Tellers' desks are cover.
3. **Job 3 — The Aurelia Casino Vault**: 4 guards, 3 cameras. The house watches.

## Tech

- Plain static files under `game/` — no build step, no network request, no library.
- `game/src/`: one job per file — `config` (tuning), `levels` (the three rooms),
  `vision` (cones and line of sight), `world` (rules and guard AI), `input`,
  `audio` (synthesised WebAudio effects), `render` (canvas), `shots` (screenshot
  staging), `main` (boot and loop).
- `?seed=N` fixes a night's patrols; `?shot=start|play|tense|end` stages a
  screenshot scene from the real rules.
- `main.ts` hands the game in; `serve.ts` serves `game/` locally on port 8080.

## Entry

Built for the make.fun bounty
[Make the best heist game](https://make.fun/bounty/best-heist-game-20261122-0559)
— the 10 highest-ranked entries share $50. Original idea, art, sounds and names;
nothing here copies a commercial game.

License: MIT.
