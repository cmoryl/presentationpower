---
name: DataForce product accents
description: DataForce (bm-product) uses Green #7BCD3A + Blue #139DD8 accents; also offered as text/tone swatches
type: design
---
DataForce is a product brand (not a TransPerfect division), so it is exempt from the
"no division accent colors" rule.

- `bm-product` tokens in `src/lib/taxonomy.ts`: primary `#7BCD3A` (DataForce Green),
  accent `#139DD8` (DataForce Blue), surface `#EEF1F7`, ink `#03002C`.
- Both hexes are available as author swatches: `TONE_SWATCHES` (`src/lib/item-tone.ts`)
  for object/row accents and `COLOR_SWATCHES` (`src/components/slide/LiveEditOverlay.tsx`)
  for per-string text color, alongside the custom "+" color input.
