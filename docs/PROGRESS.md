# APEX TYPE — Progress

Current objective: publish v1.2.0 with a cinematic Auto camera and random paragraphs.

Progress: [##########] **100% — verified v1.2.0, GitHub release and Vercel production.**

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
- [x] Push, verify CI/Vercel, publish v1.2.0 and export final documents.

## Verification
18 tests cover simulation, collection, multiplayer API, Chase, passage selection, and director continuity/visibility/clearance at 8,002 sampled desktop/portrait poses. Browser lap passed, replay changed the paragraph, manual Chase/Auto and pause passed. Different reloads showed different passages. Initial automation typed during countdown and lost leading characters; corrected the harness to wait for running. This was a test setup issue.

## Current implementation
src/render/director.ts owns progress keyframes and quintic orbital interpolation in the local track frame. src/render/world.ts applies Auto unless reduced motion is enabled, and retains the existing finish framing. src/simulation/race.ts contains the append-only passage library and randomPassageIndex; src/main.ts chooses initial and subsequent solo text. Multiplayer continues using shared server-selected indices.

## Blockers
None for the requested camera/text release. Existing hosted multiplayer backend limitations are unchanged.

## Publication
Source commit: e2e51707f1f07122031b700d05c222df965710c3.
CI passed: https://github.com/remriel/apex-type/actions/runs/38622889920
Release: https://github.com/remriel/apex-type/releases/tag/v1.2.0
Live: https://apex-type-five.vercel.app/
Vercel production dpl_7LD7WpJ8M43A5g7anaRkiL1hkowb is READY for the source commit; alias returns HTTP 200 and index-DGElaLiU.js matches the tested local build.

## Exact next steps
1. Requested camera and passage work is complete.
2. On new work, inspect Git/source/tests and read both project documents.
3. Preserve Auto as default, manual views, random solo text, shared multiplayer indices, and the original High quality track glow.

## Active v1.2.1 hotfix
Progress 80%: Auto/reduced-motion guard fixed; UI now defaults accurately to Chase under reduced motion and explicit Auto enables director. 19 tests/build pass. Browser emulated reduced-motion verification and Vercel publication in progress.
