# RECOVERY NOTICE

This repository was reconstructed from:
`workplace_portal_work_canonical_handoff_2026-08-18_v2.0.json`

It is NOT the original Git repository.

## What is exact
Files whose full UTF-8 contents were embedded in the canonical handoff were restored byte-for-byte
from that handoff snapshot.

## What is not exact
- Original Git commit history after the historical base commit is unavailable here.
- Files listed only by path/hash in the handoff were not invented.
- Changes reported after the v1.1 snapshot (meeting-room building-wide availability filter,
  responsive PC layout, later home/admin/mobile refinements) are recorded in the v2 handoff but
  are not guaranteed to be present in these restored source files.

## Claude Code first steps
1. Read `handoff/workplace_portal_work_canonical_handoff_2026-08-18_v2.0.json`.
2. Read `RECOVERY_MANIFEST.json`.
3. Open the live reference URL:
   https://workplace-mobile-poc.seho-kim.chatgpt.site
4. Compare the recovered source against the live PC/mobile UI.
5. Preserve existing behavior; do not rebuild from scratch.
6. Re-apply only post-v1.1 items confirmed missing from the recovered source.
7. First open bug: mobile "업무 진행 단계" text/stepper overlap.
