# APEX TYPE — Progress

Current objective: publish the 3D typing racer with human multiplayer, classic-car selection/unlocks, a public GitHub repository, screenshots, and continuity documents.

Progress: [#########-] **95%** toward final verified repository handoff. Game features are complete. Final screenshot recheck, push, and remote verification remain. **Sites hosting is externally blocked.**

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
- [ ] Recheck mobile overlap repair and capture final screenshots.
- [ ] Push source/assets/screenshots/docs and verify remote commit/public visibility.
- [ ] Deliver repository, local preview, package, and both documents.
- [ ] Publish through Sites when quota permits; no live URL may be claimed before success.

## Current implementation state
Game, classic roster, garage, multiplayer Worker/API, migrations, extension guide, and screenshots are complete. Final small changes derive control/scene bounds from actual typing-dock height, restore saved sound preference, and apply performance mode before asset loading. Build passes after these repairs.

## Verification performed
All 11 tests pass: simulation, unlocks, capacity, host authorization, prefix/sequence validation, recovery, rematch gating, and shared car choice.

Browser: normal wrong keys block distance; Backspace recovers; pause freezes timer; full passage produces results; replay resets. Two contexts saw the same passage, selected different classics, shared 29%/20% progress, finished with matching server times/ranks, and returned to lobby on rematch. A seeded two-race profile finished its next lap and unlocked Charger at three races. Three starter cards were enabled, six cards total. Mobile screenshots exposed an overlap, now repaired and awaiting final recheck.

## Blockers
New Sites registration still returns `site_hosting_usage_limit_reached` after the user deleted a Site. List reconciliation found no APEX TYPE project. No unrelated Site will be replaced. Public repository exists; final push is pending.

## Exact ordered next steps
1. Restart production preview and recheck mobile controls at 390x844 and 360x640.
2. Capture final desktop/mobile/garage screenshots; confirm no page errors or failed assets.
3. Update QA.md and this progress record.
4. Commit/push final source; verify remote HEAD and public visibility.
5. Save portable production package and copies of both continuity documents under outputs.
6. Deliver links and explicitly report the Sites quota blocker. Resume hosting from PROJECT_STATE.md when availability changes.
