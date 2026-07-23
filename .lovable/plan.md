
# Shared Modules → Print Sections (Phase 1: Stats family)

Prove the pattern with the **Stats** family before rolling out to every variant. Once approved, subsequent phases (Quotes, Logo Grids, Timelines, Maps, Comparisons, Charts) reuse the same plumbing.

## What ships in this phase

1. **A print block model** — a new content type `PrintSection` that any of the four print layouts (Case Study, Spotlight, eBrochure, Adaptor Brief) can host in a `sections[]` array.
2. **Portrait-native renderers for 3 Stats variants** — `MV-KPI-DASHBOARD`, `MV-STAT-CALLOUT-ROW`, `MV-STAT-BENTO` — hand-tuned for portrait canvas and light/dark modes, not just container-scaled.
3. **"Add Section" picker in the print editor** — inserts a Stats block anywhere in the document; each block is orderable, editable, deletable.
4. **Default template slot integration** — the existing `stats[]` fields on Case Study / Spotlight / eBrochure become drivable by a chosen stats variant (default keeps current look; power users can swap the visualization without leaving the template).
5. **Export path** — sections render inside the same page container so PDF and PPTX exports pick them up with no extra work.

## Architecture

```text
src/lib/print-assets.types.ts
  + PrintSection = { id, kind: "stats", variantId, data }
  + CaseStudyContent.sections?: PrintSection[]      (and same on the other 3)

src/components/print/sections/
  PrintSectionRenderer.tsx     switch on section.kind → variant
  PrintSectionPicker.tsx       drawer: preview + insert
  stats/
    KpiDashboardPortrait.tsx   portrait-native MV-KPI-DASHBOARD
    StatCalloutRowPortrait.tsx
    StatBentoPortrait.tsx
    shared.ts                  glass + ink helpers, matches CaseStudyLayout tokens

src/components/print/*Layout.tsx
  render <PrintSectionRenderer /> for each section between hero and CTA
  new "statsVariantId" slot for the existing stats row
```

Portrait renderers share the same `glass()`, `cq()`, and ink logic already used in `CaseStudyLayout.tsx`, so blocks feel native to the document — not landscape slides shrunk down.

## Editor UX

- New "Sections" strip under the existing content inspector in `asset.$assetId.tsx`.
- "Add section" button opens `PrintSectionPicker` with live thumbnails of each Stats variant in the current brand/mode.
- Reorder via up/down buttons; delete with an icon button; edit fields inline (label / value / unit / delta) — same shape the slide variants already consume.
- Each section carries its own `data`, so the inspector reuses existing stat-editing UI patterns.

## Export

- Sections render inside the print page's `content-box`; the existing PDF export (`exportPrintAssetAsPdf`) captures them without changes.
- PPTX export for print assets is out of scope for this phase (print assets are PDF-first).

## Out of scope for Phase 1

- Other variant families (Quotes, Logo Grids, Timelines, Maps, Charts, Comparisons) — deferred to phases 2+.
- Free-form drag reordering (up/down buttons only for now).
- Cross-linking a section to a specific deck slide's data.

## Success criteria

- All three portrait Stats renderers look production-ready in both light and dark modes across all four print templates.
- Editor can add, reorder, edit, and delete a stats section.
- Default template stat row optionally uses one of the three variants without breaking existing assets (backward compatible).
- PDF export renders sections cleanly with no clipping or aurora bleed.

Approve to build.
