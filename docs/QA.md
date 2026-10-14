# QA inventory

## Claims and coverage
- Real 3D closed track, GLB cars, glowing borders: inspect a desktop screenshot and car movement during race; verify assets load without request failures.
- Correct typing drives progress; mistakes stop progress until corrected: type a prefix, wrong character, backspace, then a correct character; compare visible race percentage.
- Countdown, timer, three AI racers, finish rank: use normal keyboard input through a full race and inspect results.
- Difficulty: change Rookie/Sport/Pro before race and ensure selector is gated during the race.
- Pause/resume and restart: Esc, resume button, new-race button, race-again button; verify timers remain fixed while paused and reset for new race.
- Camera Circuit/Chase/Top: click each and capture/inspect 3D view.
- Settings: Midnight/Alpine, graphics quality, sound toggle; verify changes and persistence across reload.
- How to play dialog: open/close; active race pauses and resumes.
- Personal best: complete a race and inspect storage plus reload.
- Responsive UI: 1440x900, 1280x720, 390x844, 360x640; inspect screenshot and bounds of typing dock, dialogs, and key controls.
- Off-path: paste prevention; hidden/blurred tab pauses; malformed/unavailable storage is tolerated; WebGL context loss pauses game and renderer restoration is handled.
- Browser diagnostics: page errors, asset request failures, WebGL console output.

## Evidence
Screenshots and a compact verification record are collected during browser playtesting. Simulation tests cover timing, error correction, ranking, pause semantics, and difficulty independently of rendering.

## Verified result
11 automated tests pass, covering the six original simulation scenarios plus garage progression and the room API's capacity, authorization, shared start, prefix/sequence validation, recovery data, rematch gating, and classic-car selection. TypeScript and production Worker build pass.

Browser verification on the production build:
- Normal keyboard input advanced progress. A wrong character kept progress at 7% and applied red error feedback; Backspace and correct input recovered.
- Pause kept the timer fixed. Resume, a complete passage, results, and replay worked.
- Two independent contexts joined one room, received the same passage, and selected 180MX '94 and Eighties GT. Server progress was 29%/20%; both clients reflected it after polling.
- Both clients finished and received the same server finish order and times (Sam 01:20.8, Alex 01:21.0). A host rematch returned both clients to the shared lobby.
- The garage showed six models with exactly three starter cards enabled. Selection changed the actual 3D model and persisted in localStorage.
- A test profile seeded with two completed races finished another lap and unlocked Charger at three races. Unit tests also cover the 8/15-race boundaries and locked-selection fallback.
- Circuit, Chase, Top, and Alpine views were exercised and screenshots inspected.
- Desktop 1440x900 and 1280x720 layouts fit. Mobile 390x844 and 360x640 fit without horizontal overflow. A real pointer-action failure revealed camera/garage overlap with the dock; the ResizeObserver repair was re-tested and the garage button clicked successfully.
- Clipboard paste was blocked and left the input empty.
- WEBGL_lose_context caused a running solo race to pause. Context restoration completed without JavaScript errors.
- No page errors or failed asset requests were observed in the final functional sessions. GPU readback warnings during software-rendered screenshots are capture/performance diagnostics, not game logic failures.
- Reloading a running human race recovered all 65 typed characters, retained Running phase, and restored both participants' classic choices. Choosing a car through the lobby's garage control also worked.

Screenshots are under docs/screenshots. Functional automation used graphics Performance mode to avoid slow software shader compilation. The final desktop circuit/garage screenshots also exercised production High graphics mode without page errors.

## Publication limits
Actual hosted cross-device internet play has not been verified because Sites rejects new-site creation with site_hosting_usage_limit_reached. Multiplayer was verified through two independent browser contexts against the exact production Worker and its local SQLite adapter. The hosted D1 binding still needs deployment verification when the account permits registration.

## v1.1.0 Dynamic Chase — October 13, 2026
- All 15 automated tests pass; TypeScript and production Worker build pass. Camera tests cover speed/rival widening, mirrored corner anticipation, bounded extreme inputs, portrait player visibility, finish framing, and reduced-motion suppression.
- Chromium production preview: Chase selected on boot; full passage typed via keyboard through 31%, 64%, and 100%; results show 52 WPM, 100% accuracy, 51.8 seconds. Captured and inspected dynamic-chase-corner/race/finish screenshots.
- Replay and 390x844 portrait inspected: player and road remain visible above typing dock, no camera-control overlap. Circuit/Top/Chase selection and Esc pause exercised.
- Existing Vercel Analytics script reports 404 on local preview; no gameplay exception observed. This local analytics endpoint is unrelated to the camera change.
- Finish shot stays behind the existing blurred results overlay. No claim of changed live Vercel deployment or hosted multiplayer verification.

Vercel production v1.1.0 verification: exact camera commit deployed READY through Git integration; apex-type-five.vercel.app returns HTTP 200 and serves the matching index-D8h5F-oh.js build. Live browser loads the classic models and shows Chase selected by default.
