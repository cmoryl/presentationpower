# San Juan Bowl billboards: new direction and an example page

## Goal
Create a new high-impact billboard look that doesn't look AI-generated. The Bowl shield is the hero, and the boards read in a few seconds from the highway. Also add an example page in the Bowl event area that you can review and send to your team.

## Research to build into the page (first pass done, more sources to add)
- Drivers see a highway board for about 7 seconds and often can't look for all of it. Keep the copy to roughly 9 words or fewer (Oregon DOT). Our limit of 7 words fits.
- Three parts only: a picture or graphic, one line of copy, and the name or web address (Oregon DOT).
- Use bold, simple sans-serif type as large as possible. Light text on a vivid ground. Let the main image fill the full height of the board (OAAA).
- High contrast between text and background. Use few colours, and make them strong and bright (OAAA, PSA Research).
- Check with a "5-second test": shown briefly from a distance, can someone remember the name, the date and the web address?

I'll add more sources before building, such as OAAA's creative best-practices guide, Geopath and letter-height charts. Each fact on the page links to its source. I won't present any number that doesn't have a source.

## New design direction: "Flat Graphic Impact"
- No photo-real stadium renders and no AI-generated people. Flat, solid colour blocks in the Bowl colours (navy, gold, cyan and the supplied field green), with simple geometric football details like yard-line stripes, a bold diagonal cut and a chevron.
- The real Bowl shield is the largest thing on the board, at 60–80% of its height, on a clean ground with breathing room around it.
- Only three things on the board: the shield, one short line in English or Spanish, and SANJUANBOWL.COM. The date goes in only if the board stays within 7 words.
- High-contrast pairs: white on navy, navy on gold, navy on cyan. Nothing low-contrast or fine.

## What gets made
For each of the two sizes, 840 × 400 and 1,728 × 512, I'll make three colour versions (navy, gold, cyan), each in English and Spanish, for 12 boards in total.

Proposed copy (7 words or fewer, for your approval):
- English: "COLLEGE FOOTBALL. SAN JUAN. DEC 16" and "SANJUANBOWL.COM"
- Spanish: "FÚTBOL UNIVERSITARIO. SAN JUAN. 16 DIC" and "SANJUANBOWL.COM"
- Alternatives: "KICKOFF IN SAN JUAN" / "¡A JUGAR EN SAN JUAN!"

## Example page
- **Address:** a new page at `/events/san-juan-bowl/billboards`, with a matching sign-in-free link at `/share/san-juan-bowl/billboards` like the socials page.
- **Contents:**
  1. A short intro to the direction.
  2. The research checklist, with links to the sources.
  3. Every board shown at true proportions.
  4. A "highway view": each board shown small and slightly blurred to mimic distance, so the team can judge how it reads.
  5. A side-by-side of English and Spanish.
  6. A download button for each board.
  7. An "in place" photo for each board: a photo-realistic scene of a digital billboard beside a San Juan road near Hiram Bithorn Stadium, with the actual board artwork placed exactly on the screen. I'll make day and dusk versions. Scenes are built from real reference photos of the area, such as the Expreso Las Américas / Roosevelt Ave approaches and the stadium's sawtooth roof and floodlight pylons in the distance. Each one is captioned "Illustrative mockup, not an actual billboard location," because the real placements aren't known.
- The page is linked from the existing Bowl event home and navigation.

## Where the boards are made
- **Option A (recommended):** build them in Element as flat vector artwork from the real logo file. The geometry stays crisp, and the files download as press-ready PNGs at exact pixel size. Canva can only edit existing elements through this connection, which is what limited the first round.
- **Option B:** make them in Canva by copying and resizing existing designs, then link the Canva files from the page. Less control over the new look.

## Technical details
- New route files follow the existing `events.san-juan-bowl_.*` and `share.san-juan-bowl.*` patterns, each with its own `head()`.
- Billboard facts (date, venue, URL) come from `SJB_EVENT` in `src/lib/san-juan-bowl.ts`. The web address is added there once if it's missing.
- Board artwork is SVG, built from shared tokens in `brand-colors.ts`. PNGs are exported at 840×400 and 1728×512. Downloads are labelled as digital-display files, not print masters.
- Mockup scenes are AI-generated with an empty screen. The board artwork is then laid onto the screen with a perspective warp, so the logo and text are never redrawn by AI. Each image is stored with a "generated mockup" label.
- A small test checks that each board has 7 words or fewer and includes SANJUANBOWL.COM.
