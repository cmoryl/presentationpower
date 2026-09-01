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
