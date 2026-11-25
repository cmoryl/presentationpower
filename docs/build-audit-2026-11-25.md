# Build and loading audit — 25 November 2026

## Result
- Reported crash fixed: the source renderer used `OVC` without importing it. Full-photo heroes with coloured overlays failed during saved-material rendering.
- Shared overlay colours now derive from existing brand tokens and are supplied to the render-only engine. No material, approval, permission, event fact or artwork changed.
- Fixed 19 invalid imports from `public/icon-library`: 18 icon-pack pointers and the manifest used by asset suggestions now have byte-identical importable copies under `src/assets/icon-library`. Public files and hosted artwork remain unchanged.
- Latest automatic build/typecheck result: **build OK**, 21:15:22 UTC. No manual production build or typecheck was run.
- Final full unit suite: **2,855 passed, 6 failed; 426 files passed, 5 failed (431 total)**. This is not a clean all-app certification.

## Rule and affected places
**A saved piece must open and render in every editor, preview and supported size without crashing or changing its saved content.**

| Place | Evidence and status |
| --- | --- |
| `/asset/$assetId` saved-material editor | Read route integration and SourceBuildEditor; signed-in actual reported material `6e3cd89f-0068-45ca-b2ff-ba51bfc5fc5f` reopened successfully. Letter, Story and Square previews rendered; zero page/console errors. Size changes were not saved. |
| Print template browser `/library/print` | Read ElementUpdateDrafts and route integration; signed-in browser returned 200 and Claude-build link appeared. Individual template rendering covered by source sweep. |
| Admin print curator `/admin/print-library` | Read shared draft integration; signed-in page returned 200. Shares the corrected preview renderer. No approval action performed. |
| Module library `/library` | Read SourceModuleLibrary and route integration; signed-in page returned 200, no page errors. Shared previews use corrected renderer. |
| Social modules `/social/modules` | Read route integration; signed-in page returned 200, no page errors. Same shared library, Square format. |
| Deck library `/decks` | Read route integration; signed-in page returned 200, no page errors. Same shared library, Slide format. |
| Source PDF/PowerPoint proofs | Read SourceBuildEditor.download: captures the same rendered page, with page/image checks and explicit failures. This turn did not repeat export downloads; renderer regression sweep passed. |
| All source templates and sizes | Executed all 299 imported layouts × 14 formats (4,186 combinations); no render exceptions and source values unchanged. Existing all-module-variation suite also passed. This is execution coverage, not pixel/geometry certification. |
| Separate `/element` first-party build | Read host route and mounted store functions; signed-in issued iframe displayed Projects with no page errors. Uses issued HTML, not the React renderer; left unchanged. |
| Saved-record create/list/find/load | Read print-assets.functions.ts handlers: transfer content under existing authenticated access, do not execute the render-only engine. No record writes made by this audit. |
| Mounted Cloud store | Read mountedStore, mountedIdentity and mountedPeople: authenticated RPC/data wrappers, not source renderers. No SQL or role change. Database RPC internals were not re-audited this turn. |
| Background jobs/API routes | Source search found no renderSourceModule/renderSourcePage/engine.generated imports in functions or API routes; the missing `OVC` dependency is not executed there. Other job behavior is not certified by this audit. |
| Icon library and asset suggestions | Read both importers; invalid public imports corrected with identical source copies. Post-correction icon library returned 200; real Carbon pack fetched and parsed with 2,670 icons. Asset-suggestion provider calls were not invoked. |

## Sibling dependency audit
`no-undef` inspection of the complete render-only engine found no other unguarded missing identifiers after `OVC` was supplied. `brandLogoMissing` and `PROJECT_URL` are optional source capabilities checked with `typeof` before access; footer and CTA variants passed the existing rendering sweep. Their fallbacks remain unchanged.

## Six pre-existing failures retained, not waived
1. `sjb-recent-updates.test.ts` — newest-card assertion expects Logo animation; actual newest entry is Email banners.
2. `light-mode-surface-guard.test.ts` — dark Bowl calendar header/hero fills flagged by generic light-surface rule.
3. `london-map-export-editability.test.ts` — Ground Floor WinAnsi text assertion mismatch for STOREY’S GATE.
4. `sjb-calendar-demo.test.ts` — cover assertion expects single-post export, receives saved sequence logo cover.
5. `sjb-calendar-demo.test.ts` — headline artwork assertion mismatch for 27/set2/linkedin-portrait.
6. `sjb-event-facts.test.ts` — readiness source assertion expects Sun Belt announcement; current source is organiser website.

Read the failing tests and their concrete output. No artwork, source links, sequence selection or styling was changed to force these assertions green. They remain the separate event/export backlog; a full clean test gate is not claimed.

## Limits
This audit verifies the reported signed-in loading flow and shared renderer execution, not every route, every user role, production deployment, native Office/Adobe fidelity, the private Cloud-backed 66 reference-suite gate, two-client concurrency or presence. Agent/provider work remains untouched. Final artwork screenshot confirms a rendered nonblank preview but exposes poor dark-text contrast on this piece's photo; visual parity/contrast is not certified by the crash fix. No saved configuration was changed.