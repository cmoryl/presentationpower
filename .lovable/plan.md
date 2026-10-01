# Rebuild "TransPerfect General Slides" in the Element modules — nothing left out

## What's wrong today (found in the stored import)

- **Words are being cut off at import.** Each slide keeps only its first 16 lines of text. 15 of the 28 slides hit that limit, so the rest is silently dropped. For example, the North America office list stops at "Durham", Europe stops at "Bucharest", and the quality slide loses the second ISO standard.
- **Words run together or show code.** "Run onGlobalLink", "NorthAmerica", "Glossary &amp; Style Guide" — the spacing between text pieces and symbols like "&" aren't restored.
- **Mixed-up order.** Big-number slides (90%, 97%, 6,000+…) store figures and their labels as one flat list, so the redesign pairs the wrong number with the wrong label.
- **Picture-heavy pages fall back to a copy of the old slide** (for example "The World Runs on TransPerfect" and "20+ Recent Key Acquisitions"), so they never get the new look.

## What gets built

1. **Re-read the original file in full.** The original PowerPoint is still stored, so I re-read every slide with no line limit and keep each text box together: a figure stays with its label, and a step title stays with its description. Spacing and symbols are fixed.
2. **A "nothing dropped" check.** Every word on the original slide must appear on the new slide, its speaker notes, or a following continuation slide. If anything is missing, the slide is flagged as "Content missing" with the exact words. This becomes a permanent check for every future import, not only this deck.
3. **Each of the 28 slides placed on the best-fitting Element module**, picked slide by slide rather than by guesswork:
   - Cover → title module, with "Prepared for XYZ Company / Jane Doe / date" kept as placeholders for the user to fill in
   - Proof figures (90%, 97%, 6,000+, 10K+, 6+ continents) → the new gradient hero-number and stat modules
   - The translation process (5–8) → a process timeline with three phases
   - Office lists (9–13) → region pages with every city, split into columns, or onto two slides when needed
   - Solutions grid, AI marketplace, quality spectrum, G2 grid, translation memory and glossary examples → bento, comparison, table and logo-wall modules
   - Acquisitions and logo pages → logo-wall modules using the slide's own logos
4. **No invented content.** Figures, names and claims come only from the original deck. Nothing is reworded beyond fixing joined words, and no statistics are added.
5. **Look:** the approved Enterprise sales look (light, with a dark version) and the approved backgrounds, the same as sales decks.
6. **Delivered as a new deck** in your library, next to the import. The original import stays as it is. I review all 28 slides on screen and fix anything that overflows or looks crowded.

## How it's checked

- The "nothing dropped" report for all 28 slides, which must come back clear.
- A screenshot of every slide in light and dark mode, reviewed by eye.
- A PowerPoint download test, plus the code check and all tests.
- I'll tell you anything I couldn't check, such as opening the file in PowerPoint itself.

## Technical details

- `pptx-import.ts`: remove the `.slice(0, 16)` cap, group text by shape (`textGroups`), join runs with correct spacing, decode entities. Re-ingest only this deck from `storage_path` (existing reparse script `scripts/reparse-imported-decks.ts`).
- New `src/lib/import-coverage.ts`: normalised word-set diff of source shapes vs. mapped slide content + notes, with tests; surfaced in the imported deck audit page.
- `pptx-mapping.ts`: pair stat values with labels by shape proximity; overflow → continuation slides instead of truncation; lower the faithful-fallback rate for pages whose text was recoverable.
- Deck created through the existing `createImportedDeck` path with the Enterprise sales skins; existing approved variants only.
