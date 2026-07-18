# Backgrounds & Imagery — Everywhere

Goal: give every slide a real "Background & Imagery" control that works in the editor, survives imports, renders in the preview/share viewer, and embeds into PPTX exports. Three sources: curated library, user upload, AI generation.

## 1. Data model (single source of truth)

Add two optional fields to `SlideContent` (typed as loose keys today):

- `content.background`: `{ kind: 'library' | 'upload' | 'ai' | 'color' | 'gradient'; url?: string; presetId?: string; css?: string; scrim?: 'bottom'|'left'|'right'|'top'|'full'|'vignette'; scrimStrength?: number; imageDim?: number; tint?: string }` — applies to ANY slide as a layer behind chrome.
- `content.mediaUrl`: already exists for image-supporting variants; extend `variant-media.ts` so `normalizeSlideMedia` also preserves `background` on all variants (backgrounds are variant-agnostic).

## 2. Curated background library

`src/lib/background-library.ts` — 12–16 on-brand presets grouped by category (Navy Gradient, Aqua Mist, Editorial Grid, Dot Grid, Diagonal Rule, Concentric Rings, Aurora, Paper Grain, Duotone Photo, etc.). Each preset stores a CSS string (linear/radial gradients + SVG data-URI patterns) — no binary uploads needed, works offline.

## 3. Custom upload (Supabase Storage)

- Create private bucket `slide-media` via `supabase--storage_create_bucket`.
- RLS on `storage.objects`: users can insert/select/delete only under `slide-media/<auth.uid()>/…`.
- `src/lib/slide-media.ts` — `uploadSlideMedia(file) → { path, signedUrl }` using `createSignedUrl` (long-lived, refreshed on load).

## 4. AI image generation

`src/routes/api/generate-slide-image.ts` — streaming server route using `openai/gpt-image-2` with `stream: true` per the TanStack streaming knowledge. Client uses the existing `streamImage` helper (or a small copy) to show a live progressive image. When finalized, upload the data URL into the `slide-media` bucket so it persists.

## 5. Editor UI

`src/components/slide/BackgroundImageryPanel.tsx` — a glassy inspector panel with three tabs:

- **Library**: grid of previews; click to set `content.background = { kind: 'library', presetId, css }`.
- **Upload**: drag-and-drop → upload → set `background.kind='upload'` with signed URL.
- **AI**: prompt input → streams into preview → "Use this" persists to storage and sets `background.kind='ai'`.

For image-forward variants, a second sub-section overrides slide `mediaUrl` with the same three sources (reuses tabs). Includes scrim controls (position slider, strength, dim).

Mount into the existing slide inspector on `/decks/$deckId`.

## 6. Renderer wiring

- Wrap the current slide render in the editor and share viewer with a `SlideBackdropContext.Provider` that derives from `content.background` first, then falls back to the current `backdropForVariant` result for image-supporting variants.
- `SlideFrame` already renders a backdrop layer — extend it to accept CSS-only backgrounds (no image URL) by rendering the CSS string as `backgroundImage` on the base div, and keep scrim/tint controls intact.

## 7. PPTX export

In `src/lib/pptx-export.ts`:

- If `content.background.url` is set → prefetch as data URL and add as first slide layer (`slide.background = { data: 'image/...;base64,...' }` for full-bleed, or a scaled `addImage` for patterns) plus a `addShape` scrim rectangle matching the on-screen scrim.
- If `content.background.css` describes a solid/linear gradient → convert to `slide.background = { color: HEX }` (solid) or emit a full-bleed rectangle with `pptxgenjs` gradient-approximation (two-color linear).
- For image-supporting variants that also carry `content.mediaUrl` override, keep existing embed behavior (already implemented) but read from override first.

## 8. Import round-trip

In `src/lib/pptx-mapping.ts`:

- When the extracted slide has a full-bleed background image AND the mapped variant does NOT support slide-level imagery, promote it to `content.background = { kind: 'upload', url, scrim: 'bottom', scrimStrength: 0.55 }` instead of dumping into `extraImages`.
- When the extracted slide has a solid theme color, set `content.background = { kind: 'color', css: 'linear-gradient(...)' }`.
- Diagnostics panel already surfaces preserved vs dropped — hook the new promotion path into the "Preserved" counter.

## 9. Files touched / added

Added: `background-library.ts`, `slide-media.ts`, `BackgroundImageryPanel.tsx`, `api/generate-slide-image.ts`, migration for storage RLS.
Modified: `variant-media.ts`, `SlideChrome.tsx`, `VariantRenderer.tsx` (context provider only), `decks.$deckId.tsx` (mount panel), `pptx-export.ts`, `pptx-mapping.ts`, `share.$token.tsx` (provider), `decks.$deckId.print.tsx` and `.present.tsx` (providers).

## Out of scope this pass

- Video backgrounds.
- Per-shape image replacement inside grid/bento cells (already covered by item-level `seed`).
- Batch "apply background to all slides in section" — trivial follow-up once the single-slide flow is proven.

Confirm and I'll execute in one batched pass.
