# APEX TYPE — Progress

Objective: fix Auto staying in Chase and publish v1.2.1.
Progress: [##########] **100% — fix verified locally and on Vercel production.**

## Completed
- [x] Read instructions, source, documents and Git state.
- [x] Find silent reduced-motion bypass of Auto despite selected Auto UI.
- [x] Default to visibly selected Chase when reduced motion is requested.
- [x] Explicit Auto always enables the progress-driven director; ambient effects still respect reduced motion.
- [x] Add regression test at the camera-mode policy layer; all 19 tests, TypeScript and production build pass.
- [x] Emulate reduced motion in Chromium and verify initial Chase, then explicit Auto reaching Circuit at 25% and front tracking at 63%.
- [x] Repeat those stages on the live Vercel site; inspect both screenshots with track glow intact.
- [x] Push source, verify CI, publish v1.2.1 and export project documents.

## Implementation
src/render/director.ts exports raceCameraPose, which selects the director from explicit mode and phase. The reduced-motion preference cannot silently override Auto. main.ts synchronizes initial World mode and all button pressed states with the reduced-motion default. Existing 32 random passages, manual camera choices and track glow remain intact.

## Verified publication
Source: bcbb585c631e2d1e3c3db0593509fd005ab3a723.
CI passed: https://github.com/remriel/apex-type/actions/runs/38628847760
Vercel production: dpl_7XjxPrLtxx6fGkpahFZbeS4Uk4Vj, READY for this commit.
Live https://apex-type-five.vercel.app/ returns HTTP 200 and index-CpXxmK16.js matches the local build.
Release: https://github.com/remriel/apex-type/releases/tag/v1.2.1

## Known limitations
Production multiplayer persistence is outside this camera hotfix. Local previews report a missing Vercel Analytics endpoint; production browser verification showed no such error.

## Exact next steps
1. No required work remains for this hotfix.
2. On a new task, inspect Git/source/tests and both documents.
3. Preserve explicit Auto intent under reduced motion; never restore the hidden reduced-motion bypass.
4. Test mode-policy integration as well as pose math for future camera changes.
