# Adopt the "Spectrum" corporate deck style (Nov 2026 PowerPoint Style Guide)

## Goal

Make the uploaded TransPerfect PowerPoint Style Guide (Q4 2026, "Spectrum") the single corporate deck style in Element — **full replacement** of the current enterprise look, **dark corporate decks retired**, applied to **slide modules & decks** and **sales presets & agent**. Events, Bowl, print and other brands are untouched.

## The Spectrum spec (from the guide)

- **Canvas:** light white→lilac on every slide. No dark or full-color pages.
- **Text colors by role:** titles/headings Ink `#03002C`; body `#3D3B5C`; eyebrows & links `#003FC7`; footnotes `#5E6B99`; white only on the GlobalLink card or a photo.
- **Theme palette:** Ink, White, Slate `#424061`, Mist `#E6E6EA`, Blue `#003FC7`, Aqua `#A1FBF9`, Royal `#2F5FDB`, Lilac `#C2A3FF`, Sky `#8AB8FF`, Ice `#B9D6FF`.
- **Spectrum order (never random):** Aqua 1st (`#0FB5B2→#A1FBF9`, deep `#0A8E99`, tints `#C9F6F4`/`#E3FDFC`), Blue 2nd (`#3B7BF0→#8AB8FF`, deep `#1A3FC2`, tints `#CFE0FF`/`#E6EFFF`), Violet 3rd (`#8F6BF0→#C2A3FF`, deep `#3D1FA6`, tints `#DDD0FF`/`#EFE7FF`).
- **GlobalLink card:** the only deep block — `#1F6FD1→#2F55D6→#6440D2`, one per slide.
- **Frost card (replaces current card spec):** rounded rect, corner 0.22″, 90° white→`#F0F3FB` gradient, 0.75 pt `#D6DCF0` line, outer shadow `#03002C` at 93% transparency, blur 18 pt, distance 7 pt. Inner tile solid white, max 3 layers.
- **Type (Geist only, Verdana fallback):** slide title 36 pt Regular Ink sentence-case tight; card title 18–22 pt Medium; body 13–14 pt `#3D3B5C`; eyebrow 13 pt SemiBold CAPS `#003FC7` wide tracking; stat 44–55 pt SemiBold gradient; hero number 110 pt gradient, one per slide, always labeled; nothing below 12 pt.
- **Wordmark:** navy on light, bottom-right, 84 pt wide, once per slide.
- **Photos:** rounded frames (radius 24–40), thin white frame, soft shadow. No circles, orbs, or full-bleed.
- **Layout:** 0.75″ left/right margins, equal gaps, repeated items same size.

## Changes

1. **`src/lib/brand-colors.ts`** — add the Spectrum palette (body/footnote ink, slate/mist/royal/sky/ice, three spectrum stages with brand/light/deep/tints, GlobalLink card gradient, frost-card tokens) as corporate constants; existing BRAND values stay for events/print/social. Regenerate `src/styles/brand-tokens.css` via `bun scripts/gen-brand-css.ts`.
2. **New `src/lib/spectrum-style.ts`** — one source of truth for the Spectrum spec: type scale, frost-card geometry/shadow, spectrum ramps + ordering helper (position → stage), gradient definitions, wordmark placement, margins. Consumed by both browser renderers and PPTX emitters.
3. **Card spec replacement in corporate module renderers** — swap the current spec (0.1525″ radius, 4-stop accent→white gradient, 12 pt/4 pt shadow at 14%, 0.60″ margin) for the frost card (0.22″ radius, white→`#F0F3FB`, 0.75 pt `#D6DCF0` line, 18 pt blur / 7 pt distance shadow at 7%, 0.75″ margins) in `src/components/slide/primitives.tsx`, `SlideChrome.tsx`, the module renderers, and the PPTX emitters.
4. **Skins** — restyle **S06 Enterprise Grid** in place to the Spectrum look (S-codes are permanent; never renumbered). **S04 Precision Dark is retired from corporate/sales use** (hidden behind a flag, not deleted — per "disable before rebuild").
5. **Sales presets & agent** —
   - `src/lib/sales-deck-looks.ts`: sales decks become light-only Spectrum (`skin-s06`); the dark look is removed from the sales set and `enforceSalesDeckPack` coerces everything to it.
   - Presentation agent prompt: brand rules updated to the Spectrum spec (light-first, frost cards, spectrum order, gradient hero numbers, 12 pt floor, wordmark bottom-right, no orbs).
   - Style-intent recommender: corporate briefs rank S06 (Spectrum) first.
6. **Aurora orb backgrounds** — the guide bans orbs; corporate decks stop using `AuroraLayer`/`AuroraOrb` grounds and render the light white→lilac canvas instead. The aurora components stay for any non-corporate use.
7. **Gradient hero numbers** — stat/hero modules render big numbers/words with the spectrum gradient (aqua→blue→violet by position, 135° brand→light per number). Browser: CSS gradient text. PPTX: pptxgenjs has no gradient text fill — exports use the stage's **deep step** solid color as the honest fallback (noted in export, not silently different).
8. **Tests** — update `brand-colors-parity`, `accent-export-parity`, card-spec and sales-look tests to the new values; add `spectrum-style.test.ts` pinning every spec value above (one assertion per rule).
9. **Memory & AGENTS** — record Spectrum as the corporate deck style; update the sales-deck-looks memory (S04 dark retired, light-only Spectrum); update the card-spec rule in project knowledge.

## Out of scope (per your answers)

- Restyling saved master decks (existing decks keep their rendered look until rebuilt).
- Updating the TransPerfect master brand guide page to document Spectrum (can follow as a separate step).
- Events, Bowl, print, social kits, division guides.

## Verification

- `bunx tsgo --noEmit` + `bunx vitest run` (update the ~5 affected parity/spec tests).
- Playwright: generate a corporate deck in the preview and screenshot cover, stats, card and process slides to confirm frost cards, spectrum order, gradient numbers and light canvas render correctly; export a PPTX and confirm it opens with the frost card spec.
