# Module PPTX ↔ Preview Style Parity Check

Goal: catch any drift between what a user sees in the in-app module preview and what they get when they click **Download .pptx**, for every variant × brand × mode combination.

## What it checks

For each `(variantId, brandId, mode)` triple:

1. **Palette parity** — the exporter's `adaptPaletteForMode` output must match the tokens the `VariantRenderer` applies on screen (surface, ink, primary, accent, muted).
2. **Backdrop parity** — the aurora/photo/solid backdrop chosen for export must be the same seed + tint the on-screen `backdropForVariant` picks, and the rasterized aurora PNG must be non-empty.
3. **Typography parity** — no serif families anywhere in the exported deck; heading vs body size ratios stay within tolerance; font family resolves to Geist Sans.
4. **Spacing parity** — slide safe-zone margins (`SLIDE_W`/`SLIDE_H` insets), footer/logo clearances, and hero-to-body gaps stay inside declared tolerances.
5. **Chrome parity** — logo, footer, and page-number placements match `SlideChrome`'s live layout for each mode.

## Deliverables

- `src/lib/__tests__/pptx-parity.test.ts` — vitest suite. Runs headless (no browser); asserts palette / typography / spacing invariants by comparing exporter output objects to renderer token expectations.
- `src/lib/pptx-parity.ts` — pure helper that, given a `(variant, brand, mode)`, returns a normalized `ParityFingerprint` from both the renderer side and the exporter side. Test iterates all combos and diffs the two.
- `scripts/pptx-parity-report.ts` — optional CLI (`bun scripts/pptx-parity-report.ts`) that writes a Markdown report of drift per variant for visual triage.

## Approach

```text
for each variant in MODULE_VARIANTS:
  for each brand in BRAND_MODES:
    for each mode in ["light", "dark"]:
      previewFP = fingerprintRenderer(variant, brand, mode)
      exportFP  = fingerprintExporter(variant, brand, mode)
      diff = comparePairs(previewFP, exportFP, TOLERANCES)
      expect(diff).toEqual([])
```

`fingerprintRenderer` reads the same tokens `VariantRenderer` uses (via a small `resolvePreviewTokens()` extracted from the component). `fingerprintExporter` calls into `adaptPaletteForMode`, `backdropForVariant`, `resolveSlideChrome`, and the per-variant renderer registry to emit an equivalent shape.

Tolerances:
- Colors: exact hex match (case-insensitive).
- Spacing: ±0.05 in.
- Font size ratios: ±5%.
- Backdrop: exact seed + tint hash match.

## Refactor prerequisites

- Extract `resolvePreviewTokens(variant, brand, mode)` out of `VariantRenderer.tsx` into `src/lib/preview-tokens.ts` so both the component and the test can call it. Component keeps rendering; no visual change.
- Export `adaptPaletteForMode` from `src/lib/pptx-export.ts` (currently local).
- Add a `PARITY_TOLERANCES` constant in `src/lib/pptx-parity.ts` so tuning stays in one place.

## Runtime

Adds ~800ms to the test suite (variant × brand × mode ≈ 60 × 15 × 2 = 1,800 fingerprints, all pure JS). No DOM, no Playwright — keeps CI fast. A follow-up milestone can layer on visual-diff screenshots if the token-level check proves insufficient.

## Out of scope for this milestone

- Pixel-diffing rendered slides against rendered PPTX slides (needs LibreOffice in CI).
- Editing-mode overlays and live-edit affordances (they don't ship in the export).
- Non-module surfaces (brochures, share pages).
