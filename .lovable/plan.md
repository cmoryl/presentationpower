
# Hero-aware page capacity — pinning it down

The hero isn't a single band, it's a stack of layers, and each one changes how much vertical page real estate is truly consumed. Today `moduleBudget` is a flat constant per template, so the resize grip and the capacity meter don't "see" the hero at all. That's the bug we're fixing.

## The hero is a stack, not a strip

From `PrintHeroMedia.tsx`, the hero band is composed of:

```text
┌─ hero band (heightPct of page) ─────────────┐
│ 1. photo layer (object-fit: cover, focalX/Y)│
│ 2. accent wash (overlayOpacity)             │
│ 3. scrim gradient (scrim + scrimOpacity)    │  ← reserves copy strip
│ 4. auto-scrim boost (dynamic +opacity)      │
│ 5. fade-into-page (washStrength)            │  ← feathered seam, ~8-14% tall
│ 6. hero copy overlay (title + summary)      │  ← lives ON the band
└─────────────────────────────────────────────┘
```

Only layers 1–4 are "hard" pixels. Layer 5 (the fade seam) is the zone we already push the first module into — it's shared space, not owned space. Layer 6 (title/summary) needs a minimum legibility strip inside the band regardless of `heightPct`.

So "how much of the page does the hero really consume" is:

```text
heroCost = heightPct × pageUnits/pct
        − fadeSeam(washStrength) × pageUnits/pct    // returned to modules
        + copyReserve(hasTitle, hasSummary)         // guaranteed inside the band
```

That's the number the capacity model needs — not `heightPct` alone.

## What we'll build

### 1. `heroCostUnits(heroMedia, hasCopy)` in `print-capacity.ts`
Pure function. Converts the layer stack into page units using the same weight scale as modules. Calibrated so the current defaults (heightPct 46, washStrength 1, bottom scrim, title+summary) match today's implicit reservation — no visual regression on existing assets.

### 2. Dynamic `effectiveModuleBudget(kind, heroMedia, hasCopy)`
```text
effective = baseBudget[kind] − (heroCost − heroCostBaseline[kind])
```
Baseline picked per template so a "typical" hero yields today's budget. Bigger hero → smaller effective budget; smaller hero → more room for modules. `analyzePrintAsset` and `canAddModule` both consume this instead of the constant.

### 3. Grip clamp in `HeroResizeHandle`
The grip queries `analyzePrintAsset(kind, content)` with the candidate `heightPct` on every drag frame and refuses to cross the threshold where effective budget goes negative. Behaviour:
- normal drag: pill shows "Hero · N%"
- approaching cap: pill turns amber, tooltip "Modules using X of Y units"
- at cap: pill red, drag stops, keyboard arrows no-op past the ceiling
Hard floor at heightPct 22% and hard ceiling at 72% regardless of budget (below/above those the layout stops being a hero page — spotlight/photo template exist for those).

### 4. Text ceilings scale with hero cost
`TEXT_LIMITS` becomes a function of `heroCost`. A taller hero tightens `summary`, `challengeBody`, etc. by a modest factor (≤15%) so the `pushLen` warn/block flips fire before render actually clips.

### 5. Actionable compactions in `LayoutHealthBanner`
When `analyzePrintAsset` returns `block`, the banner already shows text hints. We add one-click actions derived from the module list:
- "Swap KPI dashboard → callout row (frees 0.8 units)"
- "Drop stats block from 4 → 3 items (frees ~0.3 units)"
- "Reduce hero to N% (frees X units)"
Each action is a store mutation; no new page, ever.

### 6. Capacity meter shows the split
The existing meter renders `used/budget`. Update its label to `modules used / budget (hero X.X)` and add a thin hero segment at the top of the bar so users see the trade-off visually.

## Technical notes

- All changes live in `src/lib/print-capacity.ts`, `src/components/print/HeroResizeHandle.tsx`, `src/components/print/LayoutHealthBanner.tsx`, and the capacity-meter render in `asset.$assetId.tsx`. Layout renderers are untouched — this is pure model + gating.
- `heroCostUnits` calibration values will be added as named constants (`HERO_UNITS_PER_PCT`, `FADE_SEAM_PCT`, `COPY_RESERVE_UNITS`) so they're tunable without hunting through logic.
- Existing test `src/lib/__tests__/print-capacity-responsive.test.ts` stays green because the default hero cost is calibrated to match today's constant budget. We'll add a new suite `print-capacity-hero.test.ts` covering:
  - identical output vs today for default hero
  - shrinking budget as `heightPct` grows
  - clamp math (max heightPct given N modules)
  - copy-reserve contribution when title/summary present vs absent
- No persistence changes; all inputs already exist on `heroMedia`.
- No migration; additive to the model only.

## Scope guard

Model + gating + banner actions only. No layout renderer changes, no PPTX/export changes, no new template kinds, no pagination.

## Verify

- unit: full vitest, including new hero-capacity suite
- typecheck: `bunx tsgo --noEmit`
- e2e: existing 61/61 stays green; add a Playwright test that drags the hero grip past the ceiling and asserts it clamps + banner shows an actionable swap
- manual: on a case-study asset, drag hero from 30% → 70%, watch capacity meter shrink, `Add module` disable, banner suggest a lighter variant

Approve and I'll build.
