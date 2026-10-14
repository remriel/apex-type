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

On October 12, 2026, the user explicitly requested public Site publication. Existing Sites were reconciled again: no APEX TYPE project exists, and one new registration attempt again returned the hosting quota error. Public Site audience is now authorized. A question is pending for the user to identify an existing Site to replace or authorize a different hosting provider. Do not overwrite an unrelated Site without that target selection.

## Verification and practical limits
11 automated tests, TypeScript, and Worker build pass. Browser testing covers solo errors/pause/finish/replay, two clients sharing passage/car choices/progress/results/rematch, classic choice and the first unlock, and camera/responsive checks. See QA.md for final evidence.

Collection and best WPM are device-local; they are not account-synced or cheat-resistant. Multiplayer is casual room play, not public matchmaking. A frontend-only GitHub Pages build cannot provide its backend. Local databases are in memory. WebGL2 and preferably a hardware keyboard are needed. Actual cross-device internet play awaits a hosted Worker/D1 deployment.

Portable deliverable: `outputs/APEX-TYPE-playable.zip` in the parent task workspace. Extracted-package smoke verification passed root HTTP 200, multiplayer health, two joined players, and distinct classic choices. Node 24+ is required; PLAY.md explains starting it without npm dependency installation. Garage tests enforce minimum starter/milestone behavior while allowing future catalog additions.

## RESUME HERE
Read PROGRESS.md, inspect Git/source/tests, and continue from the existing game. Do not restart scaffolding. If Sites permits creation, register once, immediately persist the actual returned project ID with the Sites helper, retain credentials only in memory, build/package/push the exact commit with site-workflow, deploy the saved version, and verify success. Public GitHub authorization alone does not change Sites access policy; use the user's requested sharing audience.

## October 13, 2026 — Dynamic Chase release
Current authorized objective: implement a race-responsive chase camera and publish GitHub v1.1.0. Fresh clone is in work/apex-type. README now includes a Vercel URL absent from prior handoff; do not infer deployment/backend status from stale Sites notes. Chase is now the default in World and HUD. src/render/chase.ts computes bounded camera poses from actual visual velocity, upcoming tangent, rival proximity, aspect ratio, phase, and reduced-motion preference. Follow smoothing is exponential; finish uses a rear three-quarter shot. Explicit Circuit/Top choices remain respected. No new assets or subagents needed.
RESUME HERE: v1.1.0 camera work is complete. See the verified publication record below. Continue from the actual repository; retain dynamic Chase as the default and respect explicit Circuit/Top choices.

## Verified v1.1.0 publication
- Camera/source commit: fbfd3fafce47960a967fc6b30c28d6065d39bc02. GitHub CI passed: https://github.com/remriel/apex-type/actions/runs/38492552905 .
- Published release: https://github.com/remriel/apex-type/releases/tag/v1.1.0 . Playable ZIP upload succeeded (previous upload failures are historical). Node 24+; no npm install needed. Built-package root returned HTTP 200 and multiplayer health returned ok:true.
- User additionally authorized Vercel production publication. Existing apex-type project prj_2UZBc0vXjktHzndtbknqiFG7jIK6, team_sS8RTjB1ldRc5jnptpOKb2XP, is Git-connected. Push automatically deployed dpl_8kHWKbaDuGgJsto7XqYXmTyUbN2L for the exact camera commit. READY production with alias https://apex-type-five.vercel.app/; no duplicate project or redundant redeploy needed.
- Production HTTP 200 serves index-D8h5F-oh.js, matching the verified local build. Browser loads classic models and shows Chase selected on boot. Sites quota history does not block Vercel frontend deployment. Hosted multiplayer backend remains outside this camera-release verification.


## October 14 — clarified cinematic camera and passages
The user clarified that the default camera should weave between Chase, Circuit and front-facing tracking shots as race progress advances. v1.2.0 adds default Auto, with explicit Chase/Circuit/Top overrides. director.ts interpolates quintic orbit poses in the track frame, keeping the camera above ground and clear of the car. Shot holds: Chase 0-12%, Circuit 23-28%, Chase 39-49%, Front 60-66%, Chase 78%-finish; smooth bridges span the gaps. Reduced motion bypasses the director. Narrow-screen targeting is pulled toward the player during side-on bridges.
Passages expanded append-only from 4 to 32, preserving multiplayer indices. race.ts exports randomPassageIndex; initial solo load selects randomly, subsequent solo races skip the last index. Server already imports the same passages and selects room text centrally.
A dense pose test exposed portrait offscreen framing during side-on bridges; centering repaired it. An initial extra late-lap circuit/front sequence was too compressed; removed in favor of a stable final Chase stretch. All 18 tests and production build pass. Browser QA and publication next.

## v1.2.0 verified publication
Source e2e51707f1f07122031b700d05c222df965710c3; CI passed https://github.com/remriel/apex-type/actions/runs/38622889920 . Release https://github.com/remriel/apex-type/releases/tag/v1.2.0 . Vercel production dpl_7LD7WpJ8M43A5g7anaRkiL1hkowb READY for this commit; live alias HTTP 200 serves index-DGElaLiU.js, matching local build. Browser full lap, random replay and manual camera/pause checks passed. Final screenshots use High quality and show the original amber glow. The user objected to earlier Performance-mode QA screenshots; never interpret that temporary QA setting as an art-direction change.
RESUME HERE: v1.2.0 is complete. Auto is now the accepted default (supersedes v1.1.0 Chase default). Preserve road glow. 32 passages randomize at page load and skip repeats on new solo races. No further camera or text work remains.

## October 14 — v1.2.1 Auto/reduced-motion bug
User reported Auto remained Chase throughout the lap. Found World silently bypassed directedPose when prefers-reduced-motion was true, despite Auto remaining selected. Fix: reduced-motion users start in Chase with accurate selected UI; explicitly choosing Auto always runs raceCameraPose/director. Ambient Chase speed/turn effects still respect reduced motion. Added integration-policy regression test covering reduced Chase input with Auto overview/front and manual/finished bypass. 19 tests and production build pass. Preserve glow.

## v1.2.1 publication / RESUME HERE
Fix source bcbb585c631e2d1e3c3db0593509fd005ab3a723. CI passed https://github.com/remriel/apex-type/actions/runs/38628847760 . Production dpl_7XjxPrLtxx6fGkpahFZbeS4Uk4Vj READY; live alias returns HTTP 200 with index-CpXxmK16.js. Emulated reduced-motion live browser verified accurate initial Chase selection, then explicit Auto overview at 25% and front tracking at 63%; both screenshots inspected and glow preserved. Release https://github.com/remriel/apex-type/releases/tag/v1.2.1 . Fix is complete. The old instruction that reduced motion bypasses Auto is superseded: only the initial default is Chase; an explicit Auto selection always runs the director. Test integration policy, not just pose math, for future changes.

## Auto default — user decision (October 14)
User explicitly requires Auto as the default for everyone. main.ts now initializes Auto unconditionally, including reduced-motion environments; all button pressed states match it. This supersedes the v1.2.1 Chase initial default. Reduced motion still limits ambient speed/turn effects, while Auto follows the lap director. Manual choices remain available. No new assets or race changes. RESUME HERE: preserve unconditional Auto default and road glow.

Unconditional Auto verified live: commit a62e44e, production dpl_328mmRJjQbAcRM7o9joHr5xhrCDF READY, index-BuaQHeu9.js; CI 38629325669 passed. Browser emulated reduced motion and asserted Auto selected on fresh navigation without interaction. This is the current accepted default for everyone.
