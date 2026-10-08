# Expand the Master NEXT brand kit into a complete event guide

The kit page gets six new sections. Everything is read from what the app already uses, so nothing is retyped or invented. The partner link and the download pack get the same additions.

## New sections

1. **Gradients**: every approved NEXT background, each shown as a swatch with its colour stops, its name and where it's used. That covers the scenic and pillar chevron ramps, the measured London print grounds (with their supplied CMYK builds, labelled as measured), the stair ramp, the delegate guide grounds and the division accent ramp. Each one also gets do/don't notes: one ramp per sign family, a continuous ramp across multi-part pieces (stairs, booth sides), and text kept off the light end.
2. **Sizes & aspect ratios**: a table of every sign family's supplied size and its preset sizes (pillars, pedestals, desks, kiosks, demo booths, lifts, stairs, surrounds). Digital formats are grouped by shape (wide, landscape, square, portrait, tall), with pixel sizes.
3. **Resizing**: plain-language rules taken from how the editor actually resizes. The background stretches to the new trim and bleed. Logos and text keep their size and their relative position, and they only ever shrink, never grow. Turned headlines turn around their anchor. Sign sizes come from the site survey only. Each resized size is saved as its own version, and the original file never changes.
4. **Using what we already have**: one row per sign family showing what to copy, what to change (wording, logo, size), what never to change, and the closest existing template to start from. It uses the playbook's family notes, and also lists signs that have no family yet.
5. **Event sections**: the NEXT format groups (sponsorship, social and digital, signage, pillars, credentials) and the event workspace areas (plan, programme, signage, city editions), each with what it contains and a link.
6. **NEXT Mart**: what a Mart stop is, the pillar and flat signs each stop gets, the price list (price bands, currencies, bar colours, categories) and links to the Mart pages.
7. **NEXTbrew**: the café look, which is the Brew diagonal ground plus the line pattern and how it's built, with rules on where it applies and how the café is named on signage.

The page gets a section menu down the left side, because the guide is now long.

## Download pack additions

- `gradients/next-gradients.json` and `.csv` (every stop, with measured CMYK where it exists)
- `sizes/next-sign-sizes.csv` and `next-digital-formats.csv`
- Mart price-list spec and Brew notes added to the brand-rules PDF
- The rules PDF gets new chapters for Gradients, Sizes, Resizing, Reuse, Sections, Mart and Brew

## Not changing

Templates, layouts, masters, ramps, Mart data, Brew artwork, 3D links and rooms all stay as they are. Nothing is recoloured or converted. If a value doesn't exist in the app yet, the section says "not set yet" rather than guessing.

## Technical details

- Extend `src/lib/next-brand-kit.ts` with getters that import:
  - `LONDON_STYLES` (next-london-signage), `LONDON_PACK_GROUNDS`, `STAIR_RAMP` (next-california-kiosk-live), `GUIDE_GROUNDS`/`GUIDE_GRADIENT_STOPS`, `DIVISION_ACCENT_RAMP`
  - `LEGAL_NEXT_SIGNS[].sizes`, `PILLAR_SIZES_IN`, `PEDESTAL_SIZES_IN`, `SOCIAL_FORMATS` + `aspectClass`
  - `NEXT_FORMAT_GROUPS`, `NEXT_WORKSPACE_GROUPS`/`PAGES`
  - Mart: `LONDON_PRICE_BANDS`, `MART_CURRENCIES`, `MART_PRICE_BAR_COLOURS`, `LONDON_PRICE_LIST_CATEGORIES`, `martStopPillars`/`Flats`
  - Brew: `isBrewPanel`, the `11-brew-diagonal` style and the Brew module notes
- Move the playbook's inline family audit into `src/lib/next-sign-families.ts`, so the playbook and the kit share it. The playbook keeps the same output.
- Split `NextBrandKitView` into section components under `src/components/events/brand-kit/`. The share view hides edit links, as it does today.
- Extend `next-brand-kit-zip.ts` and `buildBrandRulesPdf`.
- Verify: tsgo, vitest (including the playbook), a browser check of every section, and the ZIP contents.
