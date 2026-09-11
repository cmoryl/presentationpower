# Adopt the finished London signage files as the NEXT house set

The Dropbox folder downloaded cleanly: 8 venue areas (Exterior, GF, 2F, 3F, 4F, 5F, 6F), around
40 distinct signs, each supplied as a live Illustrator file plus a matching PDF, along with a few
reference photos and the `List Signage QEII.xlsx` schedule. The folder names line up almost one to
one with the signs already in the London kit (Albert, Victoria, Gielgud, Burton, Paolozzi, Balcony
wrap, Redgrave, Churchill booths, Cloakroom, Registration desks, Lift doors and walls, Brew table
tops, Windsor fascia, Mountbatten set wrap, Exterior flags, Canopy banner, Checkerboard tiles,
Stair glass, Pillar wraps, Wall 4E, Foyer floor vinyl, Metal logo wall, Catering table).

## What you get

1. **Every sign in the London kit serves its finished file.** Cards, live editor grounds, venue
   renders, per-sign downloads and the master kit ZIP all hand over the approved artwork instead of
   a regenerated gradient — the same behaviour four signs already have, extended to the whole set.
2. **Both file kinds per sign.** The editable Illustrator master and the print PDF are stored
   together, so a download offers "editable" or "print-ready".
3. **A template layer for the rest of the NEXT ecosystem.** Signs supplied as reusable templates
   (Lift door template with its six copy lines, Lift walls, Balcony template, Mountbatten set wrap,
   Checkerboard tiles) are registered as named templates with their trim size and copy slots, so a
   new venue can pick a template, drop in its own room names and sizes, and get the same look.
4. **A signage schedule check.** The supplied spreadsheet is read and any sign in it that the kit
   does not yet carry, or that carries a different size, is listed for you.

## How it works

- Extract the folder, pair each `*.ai` with its `* copy.pdf`, and drop the duplicate `copy`
  suffixes and stray `test.png` grabs.
- Match each pair to a venue item id in `src/lib/next-london-venue-items.ts` by name and trim size;
  report anything unmatched rather than guessing.
- Render a flat JPG proof per sign for the card previews.
- Upload master, print PDF and proof to the private `london-live-files` store and register a row per
  sign through the existing live-file publishing path, so the set can be replaced later without a
  rebuild. Extend the table and function with a `print_path` column for the PDF.
- Extend `src/lib/next-london-supplied-masters.ts` and the download menu so the print PDF is offered
  next to the editable master, keeping supplied files exempt from generator QA (nothing generated).
- Add `src/lib/next-venue-templates.ts`: a venue-agnostic registry of template artwork keyed by
  sign type, trim size and editable copy slots, consumed by the London kit today and available to
  the next city.
- Verify: pull each registered file back down, confirm the bytes match what was supplied, open the
  London hub and check every card paints its finished artwork, then run typecheck and the suite.

## Notes

- The supplied files total about 456 MB. Storage upload of the full set will take several minutes.
- A few files are supplied at reduced scale (`@50%`, `25percent of 11775x1350mm`, `10th scale`).
  Those keep their true dimensions in the sign record and the scale factor is recorded in the note
  so nobody prints them at file size.
- The `.ai` files are supplied verbatim and are not re-outlined or re-coloured.
