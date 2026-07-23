
# Print Asset Studio — Case Study v1 + Unified Division Knowledge

Two changes rolled into one plan:

**A.** Add a parallel Print Asset creation flow (Case Study v1), wired into deck/module logic.
**B.** Make every division's knowledge (brand, guides, RAG chunks, logos, imagery, stats, quotes, case-study library, PPTX seeds) a **single shared source** consumed identically by decks, PPTX exports, and print assets — so any surface can draw from the same well.

---

## A. Print Asset Studio (Case Study v1)

### Data model

New table `public.print_assets`, parallel to `decks`:

```text
print_assets
├─ id, user_id, kind ('case-study' now; spotlight/ebrochure/adaptor later)
├─ title, brand_mode_id (division token)
├─ brief_id → briefs(id)              -- reuses shared brief entity
├─ source_deck_id → decks(id)          -- optional
├─ source_slide_ids uuid[]             -- optional
├─ source_module_ids text[]            -- optional
├─ status, content jsonb, context jsonb
├─ share_token, share_expires_at
└─ created_at / updated_at
```

Grants: authenticated CRUD own rows, service_role all. RLS: owner-only; anon SELECT when `share_token` valid (mirrors `get_shared_deck`).

### Standalone brief tailored to print

`src/routes/asset.new.tsx` — lean, generate-first, print-specific fields:
- **Outcome**: kind (Case Study active; others locked), title, division.
- **Story**: prospect, industry, audience, engagement summary, 3 stats, hero quote + attribution, expert/contact.
- **Print spec**: page size (A4 / Letter / Square), distribution channel, CTA label + URL, contact-card toggle.

Writes a `briefs` row + `print_assets` draft, routes to the editor.

### Four entry points (same brief flow, different seed)

1. Top nav "New Asset" (`AppShell.tsx`).
2. Home Command Center tile (`src/routes/index.tsx`).
3. Deck export menu → "Build Print Asset ▸ Case Study" — seeds division, brief, prospect, stats, quote from deck.
4. Module Library modal → "Use in Print Asset" — seeds the matching content block into the case-study scaffold.

### Case Study editor — `src/routes/asset.$assetId.tsx`

- **Left**: constrained page spine (Cover · Challenge · Solution · Result · Stats · Quote · CTA/Contact).
- **Center**: full-bleed print canvas at target page size, aurora backdrop, top-layer division logo, `LiveEditOverlay`.
- **Right**: brief facts, stat editor, quote editor, expert card, CTA, density preset, page-size + print-safe toggle.

Print-specific advanced features:
- Print-safe area + bleed marks toggle.
- Density presets (Compact / Standard / Airy).
- **"Draft from division knowledge"** — Deep RAG synthesis into Challenge / Solution / Result (uses the unified knowledge layer in section B).
- **"Import from deck slides"** — pick source slides, map into case-study blocks.
- Export: HD/4K PDF (Light + Dark), PNG per page, print-ready PDF with bleed/crops. Reuses `slide-image-export.ts` + `pptx-export` font embedding.

---

## B. Unified Division Knowledge Layer

**Goal:** one canonical division profile, consumed identically by deck editor, PPTX exporter, print assets, and every AI agent.

### What already exists (kept)

- `brand_modes` — division tokens + accent palette.
- `knowledge_entries` — RAG chunks, `division_id` filtered.
- `brand_asset_chunks` — deep-RAG vector chunks.
- `brand_assets` — division PDFs.
- `client_logos` / `division_imagery` — LogoHub + imagery pool.
- `library_slide_examples` — module slide examples.
- Static division logos in `/public/brand-logos/`.

### The gap

Each surface (deck live-edit, PPTX export, print asset, agents) currently loads a different subset of these tables with different filters. Any missing piece = a blank slot on that surface.

### The fix — one server function, one context object

New `src/lib/division-knowledge.functions.ts`:

```ts
getDivisionContext({ divisionId, options })
  → {
      mode: BrandMode,                    // tokens, accents, dark/light rules
      logos: { horizontal, vertical, mark, safe_zone },
      imagery: DivisionImage[],           // approved backdrops
      guides: BrandGuide[],               // hero, tone, values
      knowledge: KnowledgeEntry[],        // full RAG chunks
      stats:   DivisionStat[],            // KPIs seeded from guides + PPTX
      quotes:  DivisionQuote[],           // approved pull-quotes
      caseStudies: CaseStudyRef[],        // library slides tagged as CS
      pptxSeeds:  PptxSlideSeed[],        // parsed slide seeds from imports
    }
```

- Single Supabase call resolved with `requireSupabaseAuth`.
- Cached per division per request via a lightweight context cache in the same module.
- All four consumers switch to this one call:
  1. `SlideChrome` / `BrandLockup` — logo + tokens.
  2. `VariantRenderer` — imagery + accent tuning.
  3. `pptx-export.ts` — image assets, font, accent.
  4. `asset.$assetId` — full context for case-study drafting.
  5. All AI agents (Narrative Strategist, Deep RAG, Copilot, Art Director) — the same `knowledge` + `stats` + `quotes` + `caseStudies` arrays.

### Two small data additions to close the sharing loop

Both are additive; existing data is intact.

1. **`division_stats`** — one canonical list of division KPIs (label, value, unit, source_asset_id). Populated once from existing PPTX seeds and brand guides; editable per-division from the Admin → Brand Assets area. Consumed by all stat-rendering variants and the case-study stat editor.
2. **`division_quotes`** — approved pull-quotes with attribution and role. Populated from existing PPTX seeds. Consumed by every quote variant + the case-study hero quote picker.

Everything else (logos, imagery, RAG, guides) stays where it is and gets read through the unified function.

### Admin surface

Admin → Brand Assets already lists per-division content. Add two tabs to each division page:

- **Stats** — CRUD `division_stats`.
- **Quotes** — CRUD `division_quotes`.

Everything else already renders here via the same tables.

### AI agents pick the change up for free

Every agent server fn (`deep-rag`, `narrative-strategist`, `art-director`, `deck-copilot`, `case-study-synthesizer`) is refactored to accept the unified `DivisionContext` object instead of ad-hoc queries. Uniform inputs → uniform division fidelity across every output surface.

---

## Files

**New**
- `supabase/migrations/…_print_assets_and_division_context.sql` — `print_assets`, `division_stats`, `division_quotes`, `get_shared_print_asset`.
- `src/lib/print-assets.functions.ts` — CRUD + seed helpers + `synthesizeCaseStudy`.
- `src/lib/print-assets.types.ts` — typed content payloads.
- `src/lib/division-knowledge.functions.ts` — `getDivisionContext` + shared types.
- `src/routes/asset.new.tsx`, `src/routes/asset.$assetId.tsx`.
- `src/components/print/CaseStudyCanvas.tsx`, `CaseStudyInspector.tsx`, `PrintSafeArea.tsx`, `DensityToggle.tsx`.

**Edited (presentation-layer only where possible)**
- `AppShell.tsx` — "New Asset" nav.
- `src/routes/index.tsx` — Command Center tile.
- `src/routes/decks.$deckId.tsx` — export-menu entry.
- `src/routes/library.index.tsx` — module-modal entry.
- All agent server fns — switch to `getDivisionContext`.
- `SlideChrome.tsx`, `VariantRenderer.tsx`, `pptx-export.ts` — read from `getDivisionContext` instead of ad-hoc queries (behavior preserved).
- Admin → Brand Assets pages — new Stats + Quotes tabs.

## Out of scope for v1 (locked but visible)

Spotlight, E-Brochure, Adaptor Brief — schema already supports them; enabling later is only a renderer + inspector per kind.

---

Approve and I'll ship the migration first (print_assets + division_stats + division_quotes + share fn), then the division-knowledge server fn, then the Case Study flow, then the four entry points, then the agent + renderer refactor.
