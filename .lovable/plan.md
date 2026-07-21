# Faithful PowerPoint import

Right now imports only capture text + a flat list of image data URLs. When you open an imported deck in the staging library it looks nothing like the original: no positions, no sizes, no z-order, no colored fills or lines, no per-run typography. The plan below adds a full layout capture and renders it 1:1 so an imported slide looks exactly like it does in PowerPoint.

## What we capture (per slide)

Walk `p:cSld/p:spTree` in reading order and emit a typed shape list. Each entry carries:

- `id`, `zIndex` (spTree order = z-order)
- `frame`: `{ x, y, w, h, rot, flipH, flipV }` in EMU → inches (slide size read from `presentation.xml`; default 13.333 × 7.5)
- `kind`: `text` | `image` | `shape` | `line` | `group` | `table` | `chart` | `placeholder`
- Fill: `solid` / `gradient` (stops + angle) / `blipFill` (image ref) / `none`
- Line: color, width (EMU→pt), dash, arrowheads
- Preset geometry (`prstGeom`) so rounded-rect, ellipse, triangle, arrow, etc. can be rendered as SVG/CSS
- Text body: paragraphs → runs with `{ text, bold, italic, underline, size (hundredths of a point), color, font, align, bullet }`; paragraph-level indent + list level
- For pictures: rel id → resolves to the storage path we already save into `division-imagery`
- Groups: nested `children[]` with the group's own transform (so we can honor `p:grpSpPr/a:xfrm/a:chOff/a:chExt`)
- Tables: cell grid with fills, borders, and per-cell text runs
- Charts / SmartArt: keep the existing parsed structures but also record the frame so they render in place

The already-embedded image extraction stays; we just cross-reference each `p:pic` rId → saved storage path so the renderer paints the real image at the real coordinates.

## Data changes

`imported_decks.slides[i]` gains a new `layout` field:

```ts
type SlideLayout = {
  size: { w: number; h: number };            // inches
  background?: { solid?: string; gradient?: Gradient; blipPath?: string };
  shapes: Shape[];                           // in z-order
};
```

Written by `uploadImportedDeck` alongside the existing `title/bullets/notes/imagePaths` outline. Old rows without `layout` fall back to the current text-only card — no migration needed.

## Renderer

New component `FaithfulSlideCanvas` (in `src/components/slide/`). Fixed internal canvas of `SLIDE_W_IN × SLIDE_H_IN` inches scaled to the parent via CSS transform (same approach as `ScaledSlide`).

- Absolute-positioned `<div>` per shape, sized in `%` of the slide inches so the canvas scales cleanly
- Preset geometries rendered as SVG `<path>` when they're not plain rectangles (ellipse, roundRect, triangle, chevron, arrow, callout)
- Gradients → CSS `linear-gradient` / `radial-gradient` with the captured stops
- Pictures → signed URL from the existing per-slide `imagePaths[]`
- Text: each run rendered with its bold/italic/color/font/size; paragraph alignment + bullet from the paragraph properties
- Groups → nested container with the group transform applied
- Rotation via `transform: rotate()`; flips via `scaleX/Y(-1)`

Fonts fall back to the deck theme's `headingFont` / `bodyFont`; when a run names a font not loaded on the page we set `font-family: "Name", <fallback>` so it degrades gracefully.

## UI wiring

`/library/imported`:

- Slide card: replace the text-only preview with a small `FaithfulSlideCanvas` thumbnail (aspect-ratio 16/9)
- Inspect modal: full-size faithful canvas + the existing outline text tab beside it
- Add a "Fidelity" badge on each card (green when `layout.shapes.length > 0`, amber "Text only" for legacy rows)

Everything else — approve-to-library, `send to library`, download original .pptx — stays.

## Scope of shape features covered

In: text boxes, pictures, tables, groups, connectors/lines, common `prstGeom` (rect, roundRect, ellipse, triangle, rtTriangle, parallelogram, trapezoid, diamond, pentagon, hexagon, chevron, arrow variants, callout), solid + gradient + picture fills, line dash + arrows, rotation/flip, per-run typography, paragraph alignment + bullets.

Deferred (called out in a small tooltip on the fidelity badge when detected): 3-D effects, shadows/glows/reflections, ink annotations, embedded video/audio, animations/transitions, WordArt text effects, math equations. These fall back to a plain rendering (no shadow) rather than being dropped.

## Files touched

- `src/lib/pptx-import.functions.ts` — new `extractSlideLayout(doc, rels, imagePathsByRel)`; emit `layout` on each `ParsedSlide`. Add typed `Shape` / `Run` / `Paragraph` / `Fill` / `Line` interfaces.
- `src/lib/imported-decks.functions.ts` — persist `layout` into the `slides` JSON; return it from `getImportedDeckSlides`; wire `imagePaths` → `blipPathByRel` so the renderer gets storage paths.
- `src/components/slide/FaithfulSlideCanvas.tsx` — new renderer.
- `src/routes/library.imported.tsx` — thumbnails + inspect modal use the renderer; add fidelity badge.

## Out of scope for this pass

- Editing the imported slide (still promote-only; editing lands as a follow-up that converts a captured shape list into our native `DeckSlide` model).
- PPTX re-export from the captured layout (round-trip). We only need faithful *viewing* right now.
