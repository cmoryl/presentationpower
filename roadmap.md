# Roadmap

- [x] Fix library multi-select toggle (dev double-updater + hydration lag)
- [ ] Sales user: library deck -> save to My Files -> compare PDF/PPTX to editor
- [ ] Client-brief deck: upload a real brief, build deck with video + bento + graph + stats,
      save to My Files, then walk PDF and PPT export end to end

## Slide fit (Aug 31)
- [x] Clamp repeating collections to module capacity on every slide write (agent, MCP, copilot) so rows never render off the stage.
- [ ] Fix maturity-curve module caption layout: per-level captions all render on one baseline and overlap.
- [ ] PPTX parity audit: every module must export matching the build (checklist label/note pairing off-by-one, maturity-curve caption collisions).

- [ ] PPTX export: drop brand-tint washes and legacy alpha-circle/vector decor objects from module exports (reported Sep 1 on downloaded live pptx)
- [ ] Quote family parity: raise MV-QUOTE-METRIC / MV-QUOTE-PORTRAIT (and siblings) to the pass floor, re-sweep, re-issue master module PPTX.
- [x] VIZ family: MV-VIZ-WATERFALL / STACKED-AREA / RADAR / SLOPE / BUMP / GAUGE-GRID now export as real native PowerPoint charts (editable series + embedded worksheet). The remaining viz kinds (sankey, chord, treemap, sunburst, calendar heatmap, market map, beeswarm, dumbbell, gantt, boxplot, radial bar) have no native PowerPoint chart type and keep the design-exact vector plate.

## Scrolling
- [x] Fix pages that snap back to top / stop scrolling (router scroll restoration reset on auth SIGNED_IN re-emit)
- [x] Audit agent + presentation pages for locked (non-scrolling) full-height layouts (no locked containers found)
- [x] Restore native mouse-wheel scrolling in the deck editor by removing the root overflow/overscroll trap

## Templates / looks (Sep 2)
- [x] 28-look restyle gates: resumable coverage ledger (`tests/snapshots/export-verify.coverage.json`), `npm run verify:restyle` (+ `--shard k/n`, `--max`, `--workers`), sharded CI workflow, merge script, vitest coverage gate
- [x] 28-look restyle matrix: swept all 6,120 cells (28 looks + house light/dark × 204 modules), 0 export failures, ledger + manifest report `coverage: "full"`. Mid-run checkpoints now land in `node_modules/.cache` so the dev-server watcher can't reload the harness mid-sweep.

- [x] Modules page: old-template artifacting fixed (shorthand/longhand background patching left prior layers painted; ground surfaces now wait on the template registry too)

## NEXT London signage (Sep 3)
- [x] EPS-derived logo geometry, vertical pillar copy, scannable QR block on .svg/.ai masters + editor controls
- [x] Replace the spherical "halo" ground with a low-angle chevron sweep (cloakroom / help desk / square panels)
- [x] Verified QR + placement overrides persist in the live editor (tp-next-london-logo-placement-v1)
- [x] Real signboard sizes: per-panel measured trim W/H + bleed per edge (tp-next-london-board-size-v1) drive print preview, safe area, raster tier and both masters
- [x] Verified the .ai masters carry real EPS-derived NEXT lockup geometry (19 compound paths / 126 curve ops per panel) — no placeholder mark

- London revise: mini panel thumbnails + click-to-enlarge aspect-correct preview; per-panel rebuild (.svg/.ai/PNG).

## NEXT London vendor booths (Sep 3)
- [x] Import the 10 supplied vendor booth kiosk templates (main wall 1830×2440mm + 2 return panels 660×2440mm) as London booth panels with their real artwork as the ground
- [x] Add the 6 missing LifeSciNEXT booths (Contact Center, COA, Medical Writing, Live Conference/Events, Veeva TMS, Commercial for Life Sciences) — artwork pending, spec-built grounds
