# Extended Logo Orientations

Add two new orientations beyond `horizontal` / `stacked`, and make sure the editor, the on-screen slide, HTML/PDF print, and the PPTX export all agree on what gets drawn where.

## New orientations

| Orientation      | Description                                                          | Typical use                             |
|------------------|----------------------------------------------------------------------|------------------------------------------|
| `horizontal`     | Existing. Wordmark + mark side-by-side.                              | Default.                                 |
| `stacked`        | Existing. Mark above wordmark.                                       | Cover / hero.                            |
| `vertical-left`  | New. Whole lockup rotated -90 (reads bottom→top along a left edge). | Editorial spreads, full-bleed media.     |
| `vertical-right` | New. Rotated +90 (reads top→bottom along a right edge).             | Portrait feature, framed media.          |
| `mark-only`      | New. Icon/monogram only, no wordmark.                                | Dense content slides, watermark corner.  |

`auto` (per-slide) continues to mean "follow the deck default"; the deck default stays `horizontal | stacked`.

## What to build

1. **Type surface** — extend `LogoOrientation` in `logo-placement.ts` and mirror it in `deck-store.ts` (`Deck.context.logoOrientation`, `DeckSlide.logoOrientation`). Keep the deck-wide default limited to `horizontal | stacked` (rotated/mark-only are per-slide only) so the toolbar toggle stays a two-way switch.

2. **BrandLockup** — add a `mark-only` render path (returns just the mark tile / official mark asset) and a wrapper that applies `transform: rotate(±90deg)` with a compensating `transformOrigin` for the two vertical orientations. Vertical variants use the horizontal artwork rotated, since divisions don't ship rotated PNGs.

3. **SlideChrome placement** — when orientation is vertical, override the effective position to `top-left` (for `vertical-left`) or `top-right` (for `vertical-right`) if the caller picked a top/bottom-center slot that would collide, and reserve a narrow band along that edge. Half-size shrink rules from the previous pass still apply to `top-left / top-center / bottom-center / bottom-left`. `mark-only` inherits whatever position is set.

4. **Editor UI** (`decks.$deckId.tsx` "Logo on this slide" panel) — expand the Orientation dropdown to include the three new options. Deck-wide toolbar toggle stays horizontal/stacked. Update the position dropdown help text so it's clear that vertical orientations pin to an edge.

5. **PPTX export** — extend the block already rewritten in the previous pass:
   - Read `slide.logoOrientation` and `deck.context.logoOrientation` (rotated/mark-only per-slide only).
   - For `mark-only`, prefer a mark-only asset if the division provides one, else use the stacked artwork cropped square via `sizing`.
   - For `vertical-left` / `vertical-right`, pass `pptxgenjs`'s `rotate: -90` / `rotate: 90` on `addImage`, and swap the width/height budget so the rotated image sits in a tall band along the chosen edge. Position math becomes: place a 0.5" × 4.5" band at `x = inset` (left) or `x = SLIDE_W - inset - w` (right), vertically centered.
   - Logo remains the last thing added to the slide so it stays on top.

6. **HTML / PDF (print + document routes)** — these render through `SlideChrome` → `BrandLockup`, so once #2 + #3 land the print + PDF paths pick it up for free. Verify by checking `decks.$deckId.print.tsx` and `decks.$deckId.export.tsx` pass `logoOrientation` through unchanged (they already do).

7. **Docs + defaults** — update `LOGO_POSITIONS_META` and `resolveLogoPlacement` rationale strings so `/atlas` and future tooling list the new orientations, and extend the reset button to clear the new values.

## Files touched

- `src/lib/logo-placement.ts` (types + metadata)
- `src/lib/deck-store.ts` (Deck + Slide types + reducer)
- `src/components/BrandLockup.tsx` (mark-only + rotation)
- `src/components/slide/SlideChrome.tsx` (vertical band, half-size interaction)
- `src/components/slide/VariantRenderer.tsx` (pass-through only, no logic)
- `src/routes/decks.$deckId.tsx` (editor dropdown)
- `src/lib/pptx-export.ts` (rotate + mark-only + band positioning)

No migration needed — new orientation values simply weren't valid before, and existing decks stay on `horizontal` / `stacked`.

## Verification

- Add each of the five orientations on a test slide, cycle through all six positions, and confirm the on-screen render matches on both light and dark chrome.
- Export the same deck to PPTX and to PDF; open both and confirm every slide's logo matches the editor (position, orientation, size, top layer).
- Run `bunx tsgo --noEmit` and the existing library-coverage vitest.
