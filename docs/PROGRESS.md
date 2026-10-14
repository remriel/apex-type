# APEX TYPE — Progress

Current objective: implement dynamic Chase, publish GitHub v1.1.0, and update Vercel production.

Progress: [##########] **100% — verified camera change, published GitHub release, and Vercel production deployment.**

## Checklist and completed work
- [x] Read instructions, prior project documents, Git state and relevant renderer/simulation code.
- [x] Make Chase the default in renderer and HUD.
- [x] Add actual-motion speed zoom/distance, corner anticipation, nearby-rival framing, finish shot, portrait framing, and reduced-motion support.
- [x] Preserve manual Circuit/Top selections and smooth follow transitions.
- [x] Bump package and lockfile version to 1.1.0.
- [x] Pass all 15 tests, TypeScript, production Worker build and whitespace checks.
- [x] Browser-test a complete keyboard lap, replay, camera selection, Esc pause and 390x844 framing; inspect screenshots.
- [x] Create playable ZIP; smoke-test built server HTTP 200 and multiplayer health.
- [x] Push camera commit fbfd3fafce47960a967fc6b30c28d6065d39bc02; GitHub CI passed.
- [x] Publish https://github.com/remriel/apex-type/releases/tag/v1.1.0 with uploaded playable ZIP.
- [x] Verify Git-connected Vercel production deployment READY for the camera commit, correct alias, HTTP 200, matching build asset and live Chase default.
- [x] Update project intelligence and export both documents to outputs.

## Current implementation state
src/render/chase.ts computes bounded cinematic poses from actual visual velocity, upcoming track tangent, nearby active rivals, race phase and viewport aspect. World performs exponential smoothing, resets follow state between races, and passes phase from main.ts. Reduced motion suppresses zoom, corner swing, battle and finish effects. No assets, race rules or backend architecture changed.

## Verification and evidence
15 tests pass (four camera tests added to the existing 11). Production build passes with the existing Three.js chunk-size advisory. Desktop full lap: 52 WPM, 100% accuracy, 51.8s. Screenshots in docs/screenshots/dynamic-chase-*.png cover corners, race, results and portrait view. Local analytics script returns 404 outside Vercel; no gameplay exception was observed.

CI: https://github.com/remriel/apex-type/actions/runs/38492552905
Release: https://github.com/remriel/apex-type/releases/tag/v1.1.0
Live game: https://apex-type-five.vercel.app/
Vercel deployment: dpl_8kHWKbaDuGgJsto7XqYXmTyUbN2L, production READY, camera commit fbfd3fa.

## Blockers and known limitations
None for the camera release or Vercel frontend publication. Prior Sites registration quota remains historical. Internet multiplayer needs a shared backend; this release verifies local multiplayer health, not production room persistence.

## Exact ordered next steps
1. No remaining camera implementation or publication work.
2. For a new request, read AGENTS.md and both documents, inspect Git state and relevant source/tests.
3. Keep Chase as the default; make future camera changes in chase.ts and retain reduced-motion/portrait bounds.
4. For hosted multiplayer work, inspect the actual Vercel backend configuration before selecting a data adapter; do not deploy the in-memory SQLite adapter as persistent storage.
