# GlobalLink NEXT pillars — San Francisco (10 supplied finals)

## What I checked in the supplied PDF

I downloaded the PDF at 14:46 UTC. It is in the sandbox, not yet in the project.

- 10 pages, each 1692 × 5184 pt (23.5 × 72 in). There's no bleed box, so the trim is the whole page. Made by Canva, titled "GL PILLARS SAN FRAN 26", 27 MB.
- **Live text (Geist, embedded):**
  - The strapline BEYOND INTELLIGENCE on every page (Geist SemiBold, letter-spaced).
  - The headline on pages 1–6 and 8–10 (Geist Bold, rotated to read bottom to top).
- **Images (RGB, with soft transparency masks):** six images per page, the same set repeated on every page. They make up the violet-to-aqua chevron ground and its glow. They are about 96 ppi at full size.
- **Vector:** the GlobalLink NEXT by TransPerfect lockup appears to be vector paths (there's no matching image or font for it). Page 7's arrow is also vector.

### Differences from the brief

1. **Page 7 (DIRECTIONAL) has no headline.** The page has a large blue arrow pointing right and no word on it; the PDF has no headline text on that page. "Directional" works only as the name. The live version will have the arrow as a movable piece and no headline.
2. **The headlines are not all the same length.** WELCOME, TELEGRAPH HILL, GRAND BALLROOM, UNION SQUARE, YERBA BUENA, DISCOVERY ROOMS, NEXT MART and G2 REVIEW run about the same length. SUTTER is shorter, set larger. I'll keep each size exactly as supplied and won't even them out.
3. **Image resolution is about 96 ppi at full size.** This is usually fine for a 6 ft pillar seen from a distance. Print checks will flag it as a warning, not block it, and I won't upscale or change the images.

## What gets built

1. **Files.** The PDF is stored once and downloads byte-for-byte as the master. There's one JPG preview per page, made from the PDF itself and not from screenshots.
2. **Template listing.** A new GlobalLink pillar list with ten rows in page order, codes P5–P14. Every row has:
   - size "23.5×72 in · supplied Canva master"
   - its page preview, the master PDF download, a "Canva" link to the design, and its live editor
   - the exact names you gave ("Welcome Pillar" … "G2 Review Pillar")

   The existing GlobalLink P1–P4 Canva rows stay unchanged.
3. **Live editors.** Ten editable signs with the ids and titles you gave ("GlobalLinkNEXT <Name> pillar"):
   - 23.5 × 72 in, one "Pillar" face each, the same size picker as the Finance pillars, division GlobalLink.
   - Split into movable pieces the same way as the Finance pillars. The chevron ground stretches ⅛ in past the trim on every side to make the bleed.
4. **San Francisco page.** A "GlobalLink NEXT pillars" section listing the ten signs, placed right after the Demo booths section and built the same way.

## Headline: live and retypeable (one small addition needed)

The Finance pillars were supplied with every word already converted to shapes, so their live files have no typeable text. This PDF has the headline as real Geist Bold text, so it can be retyped.

The editor already lets you rotate typed text. But the supplied layouts have no way to *start* a piece of text rotated. I'll add one optional starting-rotation setting to typed text in a live layout, used only by these ten pillars. Existing signs don't use it, so nothing else changes.

- When printed, the headline is turned into outlines in the export, like every other sign, so no font goes to the printer.
- The strapline stays typed text at its supplied letter-spacing.
- If the starting rotation can't round-trip through save and export, I'll stop and keep the headline as a movable but non-retypeable piece, and tell you.

## Changes from your brief

- **Codes P5–P14:** kept as you asked. Codes are per division, so they don't clash with Finance's P5. Flagged only because they appear in the same listing.
- **Directional:** no headline, as explained above.
- Everything else as you specified.

## Will not touch

Existing registry rows, the shared template list file, the Finance pillars, any existing layout or file, room or venue lists (`next-sf-event.ts`, `event_rooms`), the 3D/BoothHub mapping, database changes, or generated files. Colour stays RGB as supplied, nothing is redrawn or re-typeset, and nothing is rebuilt from screenshots.

## Technical details

Files added:
- `src/assets/globallink-pillars-sf/gl-pillars-san-fran-26.pdf.asset.json` (master, via lovable-assets)
- `src/assets/globallink-pillars-sf/<slug>.jpg.asset.json` ×10 (pdftoppm from the PDF)
- `src/lib/next-globallink-pillars.ts` — `globallinkPillarRows()` (P5–P14, `secondaryUrl` = https://www.canva.com/design/DAHXbUkuBjk, `secondaryLabel` "Canva")

Files changed:
- `src/lib/next-supplied-templates.ts` — append `globallinkPillarRows()` in `suppliedTemplateRows()`
- `src/lib/legal-next-signage.ts` — 10 `DIVISION_LIVE_SIGNS` entries (`globallink-pillar-*`, face `divsign-<id>`, label "Pillar", `PILLAR_SIZES_IN`, division "globallink"); master = the shared PDF
- `src/lib/legal-next-signage-layouts.json` — 10 new `divsign-globallink-pillar-*` layouts from `scripts/legal-next-signage-extract.py` run on the PDF pages (parts, `native.bgBox` + ⅛ in ground bleed, texts for headline/strapline)
- `src/lib/next-california-kiosk-live.ts` + `KioskLayerEditor.tsx` — optional `rot` on layout texts, applied as the starting rotation (edits still override); export outlines as today
- `src/components/events/LegalNextSignage.tsx` — `SfGlobalLinkPillars` using `SignTemplateList`
- `src/routes/events.next_.san-francisco.tsx` — render it after `<SfDemoBooths />`
- `src/lib/AGENTS.md` — one rule: supplied Canva PDF pillar sets keep live headline text with layout-level starting rotation

Checks: typecheck, existing tests, browser check that one editor (Welcome, Directional) opens, retypes, saves and exports a PDF with the ground past the trim.
