# Legal NEXT signage templates: live editor + print files

## What you get
The Legal division page in the main NEXT area (`/events/next/divisions/legal`) gets a new **Legal NEXT signage** section. It shows five template cards, each built from your files, and each opens in the same live editor the San Francisco kiosks use.

| Template | Trim size | Faces |
|---|---|---|
| Entrance sliding doors | 42 × 84 in | Left door ("Learn what works."), right door ("Prepare for what's next.") |
| Top of Metro stairs | 33.2 × 8.1 in | 1 |
| Metro square columns | 41 × 81 in | Side 1, Side 2, Side 3, Side 4 |
| Metro foyer wall (top of escalator) | 173 × 96 in | 1 |
| Metro ballroom door header | 25.6 × 0.7 in | 1 |

These are general Legal NEXT templates, so no city, venue or date is added to them.

## Editing (same as the kiosks)
- A face switch for the doors (Left / Right) and the columns (Side 1–4).
- Every piece of artwork gets its own layer: backgrounds, chevrons, the Legal NEXT lockup, the TransPerfect Legal wordmark. You can select, multi-select, move, resize, lock, hide, group and recolour it in CMYK, with undo, reset and checks.
- Words stay live and editable (Geist), including multi-line text, alignment and line breaks, with CMYK text colour.
- Saves use the same per-role rules as the kiosks: brand leads and reviewers can save, sales can't, and each face is saved separately.

## Print files
- **Bleed:** a ⅛ in bleed is added by extending each background past the trim. Logos and words stay where they are. The page boxes (TrimBox and BleedBox) are set.
- **Colours:** kept in your CMYK values, never converted. Edits that recolour use the CMYK numbers you type.
- **Downloads per face:** Illustrator .ai (with named layers), PDF, layered SVG, press outlined and a PNG proof, plus an "All faces" zip. Files are named `rdraft-legalnext-…` until they're published.
- **Originals:** your five supplied files are also offered byte-for-byte as "Designer CMYK master" downloads.

## Honest limits
- Artwork drawn as one compound shape, such as a gradient-filled chevron group, stays one piece.
- The ballroom door header is only 0.7 in tall, so it's edited zoomed in. At that size the editor warns about safe margins, and those warnings reflect the supplied design.
- I can't open Illustrator here. Please check one file there before print.

## Technical details
- Generalise the kiosk live-layout engine from the fixed `KIOSK_W/H`, `KIOSK_RETURN_W` and `KIOSK_MARGIN` constants to per-layout `trimW/trimH/bleed/margin`. The layouts already carry `trimW/trimH`. SF kiosks keep identical output, and existing kiosk tests guard this.
- Faces are generalised from `"left"|"right"` to named faces (`left/right`, `side-1…4`), keeping `<id>--<face>` edit keys so saved kiosk edits are untouched.
- Build a new extraction script (pikepdf/pdfplumber) that splits each page into background + per-object native PDF pages and SVG symbols, and turns text into `LiveText`. Output goes to `src/lib/legal-next-signage-layouts.json`, with assets uploaded through lovable-assets and pointers under `src/assets/legal-next-signage/`.
- Add a registry `src/lib/legal-next-signage.ts` (ids, names, sizes, faces, master pointers). Reuse `KioskLayerEditor` through a new route `events.next_.sign-editor.$signId.tsx` with its own `head()`. Add the section component to the division page, shown only for `legal`.
- Saves reuse the existing kiosk edits storage, keyed `legalnext-<id>`, so no new table is needed. If a migration turns out to be needed, it follows create → GRANT → RLS → policies and is reported verbatim.
- Exports keep the existing `gateOnQa`-style checks, and files are `rdraft-` named.
- Verify with `bunx tsgo --noEmit`, `bunx vitest run` (plus new tests: bounds, bleed boxes, CMYK round-trip, face edits), and Playwright on one sign per type.
