# APEX TYPE — Progress

Current objective: publish the completed game as a publicly accessible Site, preserving its multiplayer backend and classic-car collection.

Progress: [##########] **100% for the verified game and public GitHub publication.** Source, assets, all eight screenshots, documentation, and passing CI are published. **Sites hosting remains externally blocked and is not claimed complete.**

## Checklist
- [x] Inspect user instructions and video reference.
- [x] Implement real 3D winding circuit and three cameras.
- [x] Implement typing/correction, timer, WPM/accuracy, AI, pause, finish, and replay.
- [x] Add four-person multiplayer rooms, shared starts/progress/results, invites, rematches, and car synchronization.
- [x] Add three starter classics and unlocks after 3/8/15 completed laps.
- [x] Make the roster extensible and document future car additions.
- [x] Integrate licensed production models, generated environment/textures, and credits.
- [x] Pass 11 tests, TypeScript, and final Worker build.
- [x] Playtest two independent clients through a complete race and rematch.
- [x] Verify selection, starter locks, and first unlock milestone.
- [x] Create public GitHub repository `remriel/apex-type`.
- [x] Recheck mobile overlap repair and capture final screenshots.
- [x] Push source/assets/screenshots/docs and verify remote commit/public visibility.
- [x] Prepare repository, local preview, portable package, and both documents for handoff.
- [ ] Publish through Sites when quota permits; no live URL may be claimed before success.

## Current implementation state
Game, classic roster, garage, multiplayer Worker/API, migrations, extension guide, and screenshots are complete. Control/scene bounds follow actual dock height; sound preferences restore; performance mode applies before loading. Final production build passes. Full laps unlock cars; unfinished five-minute multiplayer races show timeout results and do not award completion or best-WPM records.

## Verification performed
All 11 tests pass: simulation, unlocks, capacity, host authorization, prefix/sequence validation, recovery, rematch gating, and shared car choice.

Browser: normal wrong keys block distance; Backspace recovers; pause freezes timer; full passage produces results; replay resets. Two contexts saw the same passage, selected different classics, shared 29%/20% progress, finished with matching server times/ranks, and returned to lobby on rematch. A seeded two-race profile finished its next lap and unlocked Charger at three races. Three starter cards were enabled, six cards total. Mobile repair passed at 390x844 and 360x640 with a real garage click and no horizontal overflow. Clipboard paste was prevented; graphics context loss paused and restored without page errors. Refresh recovered a running human race's 65 typed characters and selected cars. High graphics screenshots also passed.

Publication: remote main matches the game commit `0938e2717ef881b5640c3b4da0f6f0782337c903`; repository visibility verified Public. GitHub CI completed successfully: https://github.com/remriel/apex-type/actions/runs/38172915417 . Final documentation updates are committed separately after this verification.

## Blockers
New Sites registration still returns `site_hosting_usage_limit_reached` after the user deleted a Site. List reconciliation found no APEX TYPE project. No unrelated Site was replaced. Public GitHub publication is complete; actual cross-device internet play through Sites remains unverified.

October 12 recheck: eight unrelated Sites remain and no APEX TYPE project was found. New-site registration was again rejected by the quota. The user explicitly authorized public Site access. Awaiting selection of an existing Site to replace, or authorization of a different hosting provider. No source functionality changes were needed; working tree was clean at resume.

## Exact ordered next steps
1. For new work, inspect Git/source and read PROJECT_STATE.md; retain the existing implementation.
2. To add a car, follow ADDING_CARS.md and extend public/cars.json without changing race rules.
3. When Sites quota permits, register one Site and persist its exact project ID immediately.
4. Build/package/push the exact source state through the Sites helper, deploy the saved Worker with D1, and verify live deployment and two internet-connected clients.
5. Update hosting status, README, and these documents with the verified URL. Do not claim a live Site before this succeeds.
