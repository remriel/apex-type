# APEX TYPE — Project State

## Objective and accepted scope
Build a TypeRacer-style game on an actual 3D circuit. The user's video reference supplied an elevated camera, dark grid ground, amber glowing edges, and a winding course. Later requests added human multiplayer, public GitHub publication with screenshots, and classic-car selection with three starter options plus unlocks from playing. Future cars must be easy to add.

No subagents are permitted and none were used. The later explicit public-repository request overrides the earlier general private-repository preference. The user's app/website neo-brutalist rule does not apply to this game.

## Architecture and rationale
- Vanilla TypeScript, Vite, Three.js 0.184, and DOM HUD/dialogs. Simulation state is separate from rendering.
- `Race` owns prefix validation, phases, time, AI pace, accuracy, and rank. Correct text maps to arc-length progress around a closed CatmullRom spline. Mistakes block progress until corrected.
- A custom road ribbon, curbs, checker line, center markings, luminous edges, and Circuit/Chase/Top cameras show actual 3D travel. Classic visuals are licensed production GLBs.
- `public/cars.json` is the extensible roster; `garage.ts` owns device-local collection progress. Three starters, unlocks at 3/8/15 laps. All performance comes from typing.
- Human multiplayer supports four racers. D1-compatible prepared SQL is shared by the hosted Worker and a Node 24 local SQLite adapter. Normalized room/player tables avoid lost updates.
- Random room codes and per-player tokens authenticate writes. Server stores token hashes; raw tokens stay in sessionStorage and are never in shared snapshots.
- Server timestamps synchronize countdowns; approximately 750 ms polling shares progress. Monotonic sequences reject stale writes. Prefix and finish time are validated/recorded on the server. Authenticated recovery replies include only that player's saved text/sequence.
- Solo pauses; multiplayer follows a shared clock. Host starts races/rematches. Rematches wait until the race ends. Multiplayer timeout: five minutes. Rooms expire after two hours; disconnect status after 20 seconds.
- Worker ESM embeds frontend/assets to avoid assumptions about separate asset bindings. `.openai/hosting.json` declares the `DB` D1 binding; schema migrations are append-only.

## Important files and APIs
- `src/main.ts`: HUD/dialogs, input, garage, `roomChanged`, results, responsive dock observer.
- `src/simulation/race.ts`: `Race.input`, `tick`, `order`, and pause/countdown rules.
- `src/render/world.ts`: `trackPoint`, `World.load`, `setCar`, `setRacers`, cameras, atmosphere.
- `src/network.ts`: room create/join/sync/start/rematch/reconnect/leave, clock offset and recovery.
- `src/garage.ts`, `public/cars.json`: model/preview paths, unlock counts, author/source/license, rotation.
- `server/api.mjs`: `/api/health`, `/api/rooms`, `/api/rooms/:code`, and join/sync/start/rematch/leave/car actions.
- `server/local-db.mjs`: development/production-preview SQLite adapter.
- `drizzle/0000_racing_rooms.sql`, `0001_car_choices.sql`, `meta/_journal.json`: migrations.
- `scripts/build-worker.mjs`, `serve-built.mjs`, `prepare-car.py`: bundling, exact-build preview, model normalization.
- `docs/ADDING_CARS.md`, `ASSETS.md`, `QA.md`, `screenshots/`: extension guide and evidence.

## Assets and decisions
Starters: Bursley '72, 180MX '94, Eighties GT. Unlocks: Charger, Model T, F40 Dream. Licensed models and previews come from Poly Pizza with CC BY 3.0 attribution in-game and in docs. Blender normalized them to six world units long, centered, grounded, with adjusted materials. Keep catalog IDs stable for saved choices. Kenney CC0 nature models support Alpine. Generated asphalt and panorama are shipped as WebP.

## Discoveries / failed approaches
- Workspace began empty. Final self-contained project is under `outputs/apex-type`.
- Default art was revised from Alpine to the video's dark circuit; Alpine remains optional.
- An early Kenney car GLB required external `Textures/colormap.png`; copying only GLB caused white cars. Final classics are normalized GLBs. Do not restore the earlier toy/race-car roster.
- Capping simulation delta slowed time on software rendering. Only camera smoothing now caps render delta; timers use elapsed wall time.
- Fixed camera-control offsets overlapped the dock on mobile. ResizeObserver now derives controls/world bounds from actual dock height and footer spacing.
- Bundled Playwright ESM failed; `createRequire` loaded its CommonJS package successfully. Use focused calls/60-second tool timeouts on the software renderer. Functional automation uses performance mode.
- A Sites transport-failed creation was reconciled with list_sites. No APEX TYPE project existed; do not create duplicates after uncertain failures.
- Initial Git push failed with an empty server reply. Retrying with `git -c http.version=HTTP/1.1 -c http.postBuffer=52428800 push` succeeded; use these scoped flags if the proxy exhibits that failure again.
- GitHub binary release upload returned HTTP 408 (upload body inactivity), including one HTTP/1 retry. The public source/screenshots are published; the verified portable ZIP is a local output. Do not claim a downloadable GitHub release without a successful future upload. An empty draft from the attempt was cleaned up.

## Repository and hosting
Public repository: https://github.com/remriel/apex-type . GitHub owner remriel, account ID 2818715. Source/assets/eight screenshots are pushed. The game commit is 0938e2717ef881b5640c3b4da0f6f0782337c903; GitHub CI passed at https://github.com/remriel/apex-type/actions/runs/38172915417 . Documentation updates follow separately. Never persist credentials.

Sites is externally blocked by `RATE_LIMITED` / `site_hosting_usage_limit_reached`, even after the user freed a slot. The reconciled list showed eight existing unrelated Sites and no APEX TYPE project. No existing Site was overwritten. Hosting manifest has `d1: "DB"`, `r2: null`, and no invented project ID. No live Sites URL is verified.

## Verification and practical limits
11 automated tests, TypeScript, and Worker build pass. Browser testing covers solo errors/pause/finish/replay, two clients sharing passage/car choices/progress/results/rematch, classic choice and the first unlock, and camera/responsive checks. See QA.md for final evidence.

Collection and best WPM are device-local; they are not account-synced or cheat-resistant. Multiplayer is casual room play, not public matchmaking. A frontend-only GitHub Pages build cannot provide its backend. Local databases are in memory. WebGL2 and preferably a hardware keyboard are needed. Actual cross-device internet play awaits a hosted Worker/D1 deployment.

Portable deliverable: `outputs/APEX-TYPE-playable.zip` in the parent task workspace. Extracted-package smoke verification passed root HTTP 200, multiplayer health, two joined players, and distinct classic choices. Node 24+ is required; PLAY.md explains starting it without npm dependency installation. Garage tests enforce minimum starter/milestone behavior while allowing future catalog additions.

## RESUME HERE
Read PROGRESS.md, inspect Git/source/tests, and continue from the existing game. Do not restart scaffolding. If Sites permits creation, register once, immediately persist the actual returned project ID with the Sites helper, retain credentials only in memory, build/package/push the exact commit with site-workflow, deploy the saved version, and verify success. Public GitHub authorization alone does not change Sites access policy; use the user's requested sharing audience.
