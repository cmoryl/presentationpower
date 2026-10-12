# Life Sciences print pieces: match the designers' originals

## Goal
The five Life Sciences pieces should open looking like the designers' files, page for page, while keeping the wording editable. Today they are poured into the library's standard e-brochure / case study layouts.

Pieces in scope:
- Connect During Your Patient's Journey (LifeSci eBro Update FA_v1)
- Global Post-Market Services, Medical Device one-pager
- The State of AI in Clinical & Regulatory Operations (8.5 x 11 infographic)
- Clinical Trial Website Localization Fact Sheet
- Baxter case study

## Approach: "Original layout" pages
For each page of each designer PDF:
1. **Ground**: render the page at print resolution with every live text run removed, so the images, gradients, shapes, icons and logos stay exactly as designed. RGB is kept; no colour conversion.
2. **Live text**: read every text run from the PDF (position, size, weight, colour, line spacing, alignment, box width). Each run becomes an editable text box at the same spot, in Geist at the designer's size. Multi-line copy wraps as one paragraph and keeps the designer's deliberate line breaks.
3. **Outlined wording**: where a file drew its headline as shapes, I replace it with real text at the measured size and flag it so you can check it.
4. **Editing**: the same page editor and print checks as today. You can retype, move, recolour and hide text and swap photos. Every edit saves per piece.
5. **Downloads**: a PDF at the original trim with bleed and crop marks, and the supplied original file.

The standard-layout versions stay available as "Library layout", so the social, print-size and slide cascade keeps working unchanged. It reads the same copy and figures.

## What changes for you
- In the print library, each of the five cards opens in **Original layout** by default, with a switch to **Library layout**.
- The made-up "Step 1–4" boxes and "Prepared for your team" are gone from the original-layout versions, because the originals don't have them.
- Baxter keeps its ContentLabs branding from the file.

## Not in this job
- The other new items now in the Dropbox folder: booth graphics, legal collateral, postcards, roll-up banner, BPO guide, playbook, whitepaper, email header, AI-compliance e-brochure and both Japanese ads. Tell me if you want them added as a follow-up.
- The Yakuji Nippo ad stays out until a 240 x 100 mm format is chosen.

## Checks before handing back
- Overlay each rebuilt page on the original and compare them. Anything that drifts more than a hair is flagged.
- Run the text-fit check so nothing clips or overlaps.
- Open each piece on screen while signed in, then download its PDF and confirm the trim size.
- Run the code check and the full test suite.

## Technical details
- Extraction script `scripts/lifesci-original-extract.py` (pdfplumber + pymupdf). Text runs are redacted for the ground; the script writes layer JSON per page.
- Grounds are uploaded via lovable-assets (`.asset.json` pointers). Layer data goes in `src/lib/print-library/lifesci-original-layouts.json`.
- A new `OriginalPageLayout` renderer is selected in `PrintKindPreview` when `content.layoutMode === "original"`. Copy fields map back to the existing content keys, so `print-cascade.ts` is untouched.
- Type sizes are measured with `public/fonts/Geist-*.ttf`, the same widths as the files' embedded Geist.
- No migrations. Edits use the existing print asset save path.
