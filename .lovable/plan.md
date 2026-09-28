# San Francisco kiosks: rebuild the live editor from your CMYK files

## What I found in each file (front page)

| Kiosk | Live text lines | Artwork | Side strips | Notes |
|---|---|---|---|---|
| COA | 11 | ~8,100 shapes (wave) | wave art on both | Clean |
| Commercial Life Sciences | 6 | light | background only | Clean |
| Contact Center | 13 | medium | background only | "SAFTEY" is misspelled in the file |
| GlobalLink Live | 13 | medium | background only | Poppins + Geist |
| Global Content Delivery | 6 | light | background only | Clean |
| Global Digital Experience | 13 | ~8,400 shapes | wave art on both | The "G"s are shapes, not letters; "ELEVATE YOU R" has a stray space |
| Learning | 7 | ~4,500 shapes | different left/right | Text is rich black, not 100K |
| Legal Support | 11 | 1 photo | small art | Heavy manual letter spacing splits words ("SU PPORT") |
| Live Customer Connect | 6 | medium | background only | Clean |
| Media | 11 | ~2,500 shapes | art on both | Coloured text (green, blue) |
| Medical Writing | 12 | medium | background only | Paragraph text has broken letter spacing ("Ag i leWriter") |
| Sterling | 0 | all outlined | background only | No editable words |
| Veeva | 0 | all outlined + 3 photos | small art | No editable words |

Every file: kiosk template, 1/8 in bleed, SWOP v2, a red "TV PLACEMENT" guide on the front (must never print).

## What gets built

1. **Kiosk-native layouts.** Each kiosk is read 1:1 from your file, with no scaling or re-laying from London, because your files are already kiosk-sized. Positions stay exactly where you put them.
2. **Every object separated onto its own layer:**
   - **Background:** full-page fills and gradients.
   - **Imagery:** photos.
   - **Content:** logos, icons, QR codes, waves, rules. Grouped the way you grouped them.
   - **Text:** each line is live, with its own font, size, CMYK colour and tracking.
   - **Guides:** the TV placement box, shown in the editor and never exported.
3. **Side strips become editable too.** Where the art differs between the two strips (COA, Global Digital Experience, Learning, Media, Legal, Veeva), each strip gets its own layers.
4. **CMYK all the way through the editor:**
   - The colour picker shows and saves C, M, Y and K values.
   - The screen shows an approximate on-screen view, and every export writes your CMYK numbers unchanged.
   - Nothing is converted.
5. **Letter-spaced text fixed properly.** Lines like "S P E C I A L I S E D" or "SU PPORT" become one real word with letter spacing, so retyping works. The look stays the same.
6. **Exports:**
   - CMYK .ai/PDF with named layers, live text, bleed and trim.
   - Press copy with outlined text.
   - Side strips.
   - PNG proof, labelled as a proof.
   - Drafts are still marked `rdraft-` until published.
7. **Checks per kiosk:** a comparison sheet (your file vs the editor's rebuilt export). Any kiosk that doesn't match is flagged, not shipped.
8. **Saved changes:** London-based edits won't line up with the new layouts. They're kept but set aside, and each kiosk starts clean from your file.

## Honest limits
- **No editable words on Sterling and Veeva:** their words are shapes, so each is one movable object. I'd need the words to make them live text.
- **Letters drawn as shapes:** the Global Digital Experience "G"s stay shapes.
- **Typos in your files:** "SAFTEY" and "YOU R" will be carried over as-is unless you tell me to correct them.
- **Illustrator check:** this can't be verified in Illustrator from here. Check one file before print.

## Technical details
- **Extraction script:** runs once over the stored masters and writes a new `kiosk-native-layouts.json` (texts in CMYK, parts with bounding boxes and group ids, layer tags, gradient stops in CMYK). It uses qpdf for decompression and pdfplumber for text, and text is stripped from the art stream before it's re-saved as CMYK PDF form art plus an RGB preview SVG.
- **Layout model:** `LiveLayout` gains `mode: "native"` (scale 1, no blocks) and colour `{ cmyk: [c,m,y,k] }`. The exporter writes DeviceCMYK/ICC SWOP operators; the RGB path stays for London.
- **Saved changes:** `kiosk_layer_edits` gets a `layout_version` so old edits are parked.
- **Tests:** every layout exists, nothing is in the TV area, nothing crosses the trim, CMYK values round-trip unchanged, no guide in exports, live text is present.
