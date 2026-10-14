# APEX TYPE — Progress

Current objective: publish v1.2.0 with a cinematic Auto camera and random paragraphs.

Progress: [#########-] **90% — implementation, tests and browser QA complete; publication in progress.**

## Completed
- [x] Reconcile instructions, docs, Git state and renderer/simulation source.
- [x] Default Auto camera smoothly transitions Chase → Circuit → Chase → front tracking → Chase as lap progress advances.
- [x] Keep manual Chase, Circuit and Top; reduced motion bypasses the director.
- [x] Add portrait framing and eased orbital transitions that avoid passing through the car.
- [x] Expand passages from 4 to 32, preserving existing multiplayer indices.
- [x] Select randomly on page load and select a different random passage for each new solo race.
- [x] Pass all 18 automated tests, TypeScript and production build.
- [x] Complete browser lap, random replay, manual camera override and pause checks; inspect desktop and mobile views.
- [x] Preserve original road materials and High quality bloom. Performance-mode QA images lacked bloom; final images use High quality.
- [ ] Push, verify CI/Vercel, publish v1.2.0 and export final documents.

## Verification
18 tests cover simulation, collection, multiplayer API, Chase, passage selection, and director continuity/visibility/clearance at 8,002 sampled desktop/portrait poses. Browser lap passed, replay changed the paragraph, manual Chase/Auto and pause passed. Different reloads showed different passages. Initial automation typed during countdown and lost leading characters; corrected the harness to wait for running. This was a test setup issue.

## Current implementation
src/render/director.ts owns progress keyframes and quintic orbital interpolation in the local track frame. src/render/world.ts applies Auto unless reduced motion is enabled, and retains the existing finish framing. src/simulation/race.ts contains the append-only passage library and randomPassageIndex; src/main.ts chooses initial and subsequent solo text. Multiplayer continues using shared server-selected indices.

## Blockers
None for the requested camera/text release. Existing hosted multiplayer backend limitations are unchanged.

## Exact next steps
1. Push completed source and screenshots; verify GitHub CI and Git-connected Vercel production.
2. Publish GitHub v1.2.0 and playable package.
3. Record verified URLs/status, export PROJECT_STATE.md and PROGRESS.md.
