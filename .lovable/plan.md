# Fix: Title/Cover Slide PPTX Export Parity

Your screenshot shows the exported PowerPoint title slide rendering a **dark purple gradient with a clipped subtitle and a misplaced logo**, while the app preview shows the **clean light title slide**. The export and the preview are resolving different looks and different text metrics for the cover.

## Confirmed findings from code inspection

1. **Covers are force-darkened on export.** `src/lib/pptx-export.ts` decides each slide's light/dark mode *before* backgrounds resolve: `kind === "cover" || kind === "divider" ? "dark" : "light"`. If the deck's effective look renders the cover light in the preview, the exporter can still paint it dark (purple field from the pack-toned palette) — the exact mismatch in your screenshot.
2. **Letter-spaced text is widened and force-wrapped.** `src/lib/pptx-text-props.ts` computes `trackPx = letterSpacingPx * (text.length + 1)` and sets `wrap: true` whenever tracking > 0. A tracked, uppercase subtitle like "UNLOCKING ORGANIC SEARCH VISIBILITY…" overflows its measured box and clips in PowerPoint — the clipped line in your export.
3. **Logo/lockup placement on the cover** is emitted from export-side geometry, not the settled preview layout, so it lands on the frame edge instead of its preview position.

## What we will change

### 1. One look resolver for preview and export
- Route the exporter's light/dark + pack decision through the **same effective-look resolution the preview uses** (slide `mode` override → deck effective look → variant role), instead of the hardcoded cover=Dark rule. A cover the preview shows light must export light, with light-slide ink.

### 2. Cover text fidelity
- In `src/lib/pptx-text-props.ts` / `src/lib/export-text-place.ts`: keep letter-spaced single-line runs on **one line** (no forced wrap), and compensate the text box width by the tracking amount so tracked subtitles/eyebrows never clip.
- Verify title size/weight/leading and the eyebrow/subtitle line breaks match the preview 1:1.

### 3. Cover chrome parity (logo, frame, footer)
- Emit the cover's brand lockup from the **settled stage measurement** (same source as the DOM decompose pass) instead of export-side estimates, so the TransPerfect Digital lockup lands exactly where the preview puts it, with correct aspect (no stretch) and no overlap with the rounded frame or subtitle.

### 4. Background plate = preview pixels
- Confirm the cover's flattened background/decor plate is rendered from the settled exact-stage (same raster the preview uses), with no leftover gradient bands or double-drawn text, and the correct master (light vs dark) is inherited.

### 5. Verification (regression-proof)
- Add/extend an export regression check that exports a deck cover → renders slide 1 of the PPTX to an image → compares against the preview screenshot for: background match, no text clipping, no element overlap, logo placement.
- Run the existing export verification sweep plus a Playwright pass on the build's Export page to confirm the fix end-to-end, with success toast on completion.

## Notes
- Scope is limited to export rendering fidelity — no changes to deck content, skins, or the editor UI.
- If step 1 reproduction reveals the deck itself carries a stale look (e.g. an old style pack saved in deck context), the fix will honor the *effective* look the preview shows rather than mutating your deck data.
