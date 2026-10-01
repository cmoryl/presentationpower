# Rebuild "TransPerfect General Slides" in the Element modules — nothing left out

## What's wrong today (found in the stored import)

- **Words are being cut off at import.** Each slide keeps only its first 16 lines of text. 15 of the 28 slides hit that limit, so the rest is silently dropped. For example, the North America office list stops at "Durham", Europe stops at "Bucharest", and the quality slide loses the second ISO standard.
- **Words run together or show code.** "Run onGlobalLink", "NorthAmerica", "Glossary &amp; Style Guide" — the spacing between text pieces and symbols like "&" aren't restored.
- **Mixed-up order.** Big-number slides (90%, 97%, 6,000+…) store figures and their labels as one flat list, so the redesign pairs the wrong number with the wrong label.
- **Picture-heavy pages fall back to a copy of the old slide** (for example "The World Runs on TransPerfect" and "20+ Recent Key Acquisitions"), so they never get the new look.

## What gets built

1. **Re-read the original file in full.** The original PowerPoint is still stored, so I re-read every slide with no line limit and keep each text box together: a figure stays with its label, and a step title stays with its description. Spacing and symbols are fixed.
2. **A "nothing dropped" check.** Every word on the original slide must appear on the new slide, its speaker notes, or a following continuation slide. If anything is missing, the slide is flagged as "Content missing" with the exact words. This becomes a permanent check for every future import, not only this deck.
3. **Understand the content first, then design it.** For each slide I work out the one message it has to land, what kind of information it is (proof, process, place, comparison, choice), and the visual that makes that message hit hardest. You get this as a slide-by-slide review to approve before anything is built:

| Slides | What the content is really saying | More impactful visual |
|---|---|---|
| 1 Cover | "Transform global business", tailored to one client | Full-bleed cover; client name, presenter and date as fill-in placeholders |
| 2 Proof numbers | Scale and trust: 90%, 97%, 6,000+, 10K+, 6+ continents | One giant gradient hero figure plus a ranked rail of the others, each figure paired with its own label |
| 3 Specializing / growth | Growth through acquisitions and regions | Split slide: growth figures on one side, a strip of division cards on the other |
| 4 World runs on TP, 5 Acquisitions | Breadth: who trusts us and who we've added | Logo walls in even, quiet grids, using the slide's own logos |
| 6–9 Translation process | One process in three phases, shown over four slides | One phase timeline (Pre-flight → Production → Post-production) with a highlighted stage on each slide |
| 10–14 Global offices | Local presence everywhere | Region pages with a map key and every city in tidy columns; one summary map page |
| 15 Productivity and spend | Solutions grouped by business goal | Bento grid, one tile per goal, its services listed inside |
| 16 G2 grid | Independent proof that we lead | A clean quadrant chart with GlobalLink highlighted |
| 17–19 AI strategy and quality spectrum | Choose the right mix of AI and human work for each type of content | A cost-to-quality spectrum bar with content types placed along it |
| 20 Global Performance Platform | One platform, several products | Product cards with an icon and one-line benefit each |
| 21 AI marketplace | Pick any engine, including your own | Grouped logo/engine wall (Neural MT vs LLMs) |
| 22 AI + human-in-the-loop | Speed of AI, precision of people | Flow diagram: AI → human post-edit → proofread → client |
| 23 Proprietary NMT | Full service list | Two-column capability list with icons |
| 24 Quality commitment | Hard tests and certifications | Big "6% / 12% pass rate" figures plus ISO certification badges |
| 25–28 Pre-flight, TM, glossary, style | Practical examples that save money and protect the brand | Before/after and side-by-side example cards (fuzzy vs exact match, soda/pop/cola, date and number formats) |

   Where a slide has more content than fits well, it continues onto a second slide instead of shrinking or dropping anything.
4. **No invented content.** Figures, names and claims come only from the original deck. Nothing is reworded beyond fixing joined words, and no statistics are added.
5. **Look:** the approved Enterprise sales look (light, with a dark version) and the approved backgrounds, the same as sales decks.
6. **Delivered as a new deck** in your library, next to the import. The original import stays as it is. I review all 28 slides on screen and fix anything that overflows or looks crowded.
7. **A direct link to the master.** The rebuilt deck becomes the "TransPerfect General Slides — master", with a short fixed web address (/masters/general-slides) that always opens the newest version straight in the editor. It also gets a "General Slides master" button on the Presentation library page and in the Elements menu. Admins and brand leads can edit it, and everyone else opens a copy, so the master can't be changed by accident.

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
