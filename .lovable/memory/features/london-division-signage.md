---
name: London division signage rules
description: NEXT 2026 London event signage — division panels print white lockups only and carry a slight division accent tint in the ground
type: feature
---

Event signage for NEXT 2026 London is the one place division accents are still used (the retired-accent rule governs decks/presentations, not the London event kit).

Rules, enforced in `src/lib/next-london-division.ts`:
- Division-specific panels (GlobalLink, Games, Finance, Legal, Life Sciences, Experience, Learn, Media, Digital, DataForce) print the **white** lockup. `white-accent` (white + colour chevrons) is the only other approved cut; `color` and `dblue` are clamped away in `londonBrandingPlan` and hidden in the pickers.
- The division accent enters the ground only as a tint at the LIGHT end of the ramp (`LONDON_DIVISION_ACCENT_WEIGHT = 0.34`, eased). The first/dark stop is never tinted — that is what holds white lockup contrast.
- Accents come from the event registry `public/canva-master-reference/next-2026-color-palette.json` (e.g. Life Sci #58ED21, Legal #3BBEB6, DataForce #5CE1E6 for this event), not the deck palette.
- `londonPanelStops()` and the `.ai` QA `expectedRamp()` both resolve the tinted ramp, so SVG/AI/CMYK/raster and QA all agree.

NEXTbrew panels (`11-brew-diagonal`) use a navy→blue→aqua ramp plus a live café motif (cup rings, steam, bean ticks) in `src/lib/next-london-brew.ts`, editable in both masters.
