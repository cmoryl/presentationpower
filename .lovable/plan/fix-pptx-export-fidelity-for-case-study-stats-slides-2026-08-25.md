# Fix PPTX export fidelity for Case Study + stats slides

## Problem

The "Enterprise Case Study" slide exports to PowerPoint looking nothing like the live editor: the three glass cards (Challenge / Solution / Result) and the stat strip (3.4x · 48% · 98%) are gone, copy is duplicated, and the layout collapsed. The "ROI & Operational Efficiency Benchmarks" slide below it has the same class of problem — stat sizing and layout don't match the live render.

## Root cause (confirmed)

Each module variant can have a hand-written native PowerPoint renderer in `src/lib/pptx-export.ts`. The case-study family renderers (`renderCaseSpread`, `renderCaseMetrics`, `renderCaseStory`) were written against an **old design**: the export draws a left navy banner with three plain 13pt text columns, while the live `VariantRenderer` design is a kicker + display title + client logo chip + three glass tiles + metric strip. Same drift pattern the codebase already documents for the CLOSE family (`DRIFTED_NATIVE_RENDERER_IDS` in `src/lib/export-native-variants.ts`). The ROI stats slide's variant has the same issue — hand-picked font sizes instead of the design's measured ones.

## Plan

### 1. Immediate fidelity fix — route drifted variants through the exact-export path
- Identify the exact variant IDs of the failing slides in the deck (case study + ROI stats) plus any other agent-emitted variants whose native renderer no longer matches the live design.
- Add them to `DRIFTED_NATIVE_RENDERER_IDS` in `src/lib/export-native-variants.ts`. These slides then export via the design-exact route: a pixel-perfect plate captured from the real on-screen renderer, with all copy re-emitted as **native, editable PowerPoint text** measured from the live DOM (exact fonts, sizes, positions, line breaks).
- Result: exported slides match the live build 1:1, text stays editable in PowerPoint. Trade-off: card graphics are fused into the plate image until step 2 lands.

### 2. Rewrite the native OOXML renderers (proper fix)
- Rewrite `renderCaseSpread`, `renderCaseMetrics`, `renderCaseStory`, and the ROI/stats variant renderer(s) to match the current `VariantRenderer` designs: glass tiles with icons, client logo chip, metric strip, correct Geist typography scale and spacing.
- Remove the variants from `DRIFTED_NATIVE_RENDERER_IDS` once the rewrite is verified, restoring fully-editable native shapes (cards, tiles, stats as real PowerPoint objects).
- Fix the duplicated header: the generic module header and the variant renderer both emit the title — dedupe so the kicker/title/client appear once.

### 3. Regression guard
- Extend the export verification tooling (`/dev/export-verify`, `export-native-variants.test.ts`) to cover the case-study and ROI/stats variants.
- Export the failing deck to PPTX, render via LibreOffice to images, and visually diff against the live slides before calling it done.

## Technical details
- Files: `src/lib/export-native-variants.ts` (drift list), `src/lib/pptx-export.ts` (`renderCaseSpread` ~L9552, `renderCaseMetrics` ~L9653, `renderCaseStory` ~L9731, stats renderers ~L3105/L3168), `src/components/slide/VariantRenderer.tsx` (live design reference, L5460+).
- The drifted/plate mechanism and its test already exist — step 1 is a list edit, not new machinery.
