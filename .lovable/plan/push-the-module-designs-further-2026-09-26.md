# Push the module designs further

The goal is bolder modules that stay within the brand rules: approved navy / blue / white only, Geist type, no accent-coloured body text, no new colours, and approved style packs untouched.

## What gets built, in order

1. **Standout layouts (new module variants, added to the library)**
   - Giant number: one figure fills about 60% of the slide, with a short label and a source line.
   - Full-bleed photo: an edge-to-edge image with a scrim and a headline, using approved imagery only.
   - Split panel: half navy and half white, with the headline crossing the split.
   - Big-rule statement: one sentence set very large, with a thick blue bar.
   - Each one gets PowerPoint export, a print version and an audit test.
   - None of them contains made-up figures. Empty slots show "[Add a verified figure]".
2. **Clearer type hierarchy across existing modules.** Every module gets one leading element, following a shared type-size scale. This covers the headline, figure or quote, and closes the gap between the lead and the supporting text.
3. **Bolder use of the approved colours.** Accents move from thin lines to large shapes (bars, panels and blocks), with an automatic contrast check.
4. **Social and small print versions designed for their size.** Each module family gets a native layout for square, story, tent card, postcard and rack card instead of a cut-down slide. Extra details (owner, timeframe) run as a caption line.
5. **Warnings panel in house colours.** The conversion warnings drop their own yellow, peach and red.
6. **The 15 modules without sample text.** These stay blank as you asked, but they get a clean labelled placeholder instead of a module name or a made-up "97".

## How it will be checked

- Before-and-after screenshots of every module family.
- An automated contrast check.
- A PowerPoint export test for each new layout, plus the full code check and all automated tests.
- The conversion audit across all 14 formats, run again.
- Anything I can't check here, such as opening files in PowerPoint itself, will be listed.

## Technical details

- New variants go in the taxonomy and variant registry, each with its own native PowerPoint emitter, and must be permitted by their section frameworks.
- The shared type scale lives in the existing typography and open-space-fill files, and colours come from the existing token files only.
- Social and print layouts extend `social-module-layouts.ts` and `PrintBriefPreview`, and caption lines go into `cross-format-adapt.ts`.
- This runs as several batches. Your earlier instruction to keep going between batches without check-ins applies.
