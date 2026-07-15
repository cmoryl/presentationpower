
# TransPerfect On-Demand Enablement Platform — MVP Plan

Builds directly on your two uploaded specs (**Master Template Framework v0.2** and **Master Wireframe Atlas v0.1**) plus the concepts from **Slides Creator**. This is not a generic slide app — it's the runtime for the modular architecture those docs describe. MVP = Guided Brief → AI Assembly, with the module/layout system as the load-bearing layer underneath.

## Architecture — mirrors your spec exactly

Six-layer hierarchy from the Atlas, encoded as first-class data and code:

```text
Brand Mode         enterprise | subcompany | division | product | co-brand
   ↓ controls tokens, logos, protected elements
Section Framework  SF-01..SF-16  (Open, Frame, Explain, Prove, Recommend, Close, etc.)
   ↓ controls sequence, pacing, permitted module families
Module Family      MF-01..MF-N   (Opening, Context/Challenge, Insight, Proof, Case Study…)
   ↓ controls inputs, validation, review
Module Variant     171 named variants (e.g. "three challenge cards", "cost of inaction")
   ↓ controls capacity and smart fallback
Layout Framework   LF-01..LF-24  (three-column, mosaic, timeline, matrix/quadrant…)
   ↓ controls zones, proportions, alignment
Component          headline, body, image, chart, quote, proof point, CTA, source
                   with ph_* placeholder ids from Section 22
```

A brief resolves to: brand mode + narrative archetype → an ordered set of section frameworks → for each, a module family → a variant → a layout → filled components. This is the "Selection sequence" from Part 01 of the Atlas, encoded as a pipeline.

## Data model (Lovable Cloud)

```text
brand_modes          id, name, tokens_json, protected_elements_json
section_frameworks   id (SF-XX), name, purpose, permitted_family_ids[], pacing_rules
module_families      id (MF-XX), name, section_ids[], input_schema_json, review_level
module_variants      id, family_id, name, capacity_json (min/max items, char caps),
                     fallback_variant_id, permitted_layout_ids[]
layout_frameworks    id (LF-XX), name, zones_json (grid + proportions), constraints
components           reusable placeholder types: ph_headline, ph_body, ph_stat, ph_chart,
                     ph_image, ph_quote, ph_proof, ph_cta, ph_source, ph_logo
narrative_archetypes id, name, section_recipe (ordered SF-ids)
section_recipes      curated bundles from Framework Section 21

# Runtime content
slide_modules        instance of a variant with real content: variant_id, layout_id,
                     brand_mode_id, tags (industry[], division[], solution[],
                     sales_stage[], audience[]), approval_status, approved_at,
                     expires_at, owner, content_json, locked_fields_json,
                     editable_fields_json, source_deck, thumbnail_url
briefs               guided brief inputs
decks                brief_id, archetype_id, brand_mode_id, status, title
deck_slides          deck_id, position, module_id, variant_id, layout_id,
                     overridden_content_json, ai_change_log_json
approvals            per-deck / per-slide review state
```

All public tables get `GRANT`s + RLS. Roles table + `has_role()` for admin, brand-reviewer, content-owner, sales.

The taxonomy tables (SF/MF/MV/LF) are seeded from a checked-in JSON derived from your two docs. Editing them is admin-only.

## Route map (TanStack Start)

```text
/                          Dashboard
/brief/new                 Guided brief wizard
/brief/$id                 Brief detail + "assemble" trigger
/decks/$id                 Deck editor: ScaledSlide + module inspector + AI panel
/decks/$id/present         Fullscreen presentation
/atlas                     Browse the taxonomy: SF → MF → MV → LF
/atlas/sf/$id              Section framework detail (permitted families, examples)
/atlas/mf/$id              Module family detail + variants
/atlas/mv/$id              Variant detail: capacity, fallback, permitted layouts
/atlas/lf/$id              Layout framework detail: zones, constraints
/library                   Approved slide-module directory (search/filter)
/library/$moduleId         Module record (Appendix A schema)
/admin/approvals           Review queue
/api/chat                  AI SDK stream endpoint (deck-scoped assistant)
```

## Guided Brief → AI Assembly (MVP flow)

1. **Structured brief wizard** — prospect, industry, division(s), opportunity type, sales stage, meeting objective, audience, brand-mode route (enterprise / subcompany / division / product / co-brand), length target, deadline, known client facts, risk level (internal vs external / high-risk).
2. **Resolve narrative archetype** — `resolveArchetype` server fn picks or proposes an archetype (problem-to-solution, executive briefing, product pitch, cross-sell) based on brief.
3. **Section plan** — expands archetype into an ordered list of section frameworks (from Section 21 recipe library, adjusted for brief).
4. **Module selection per section** — for each section, `selectModule` server fn queries `slide_modules` filtered by permitted family, tags, brand mode, approval + expiration, ranks by tag overlap + freshness. Returns top match plus 2 alternates.
5. **Variant + layout fit** — `fitVariant` chooses the module variant + layout consistent with the module's content density using the capacity rules from Section 23. Enforces the non-negotiable from the Atlas: "switch variant, split slide, or move detail to appendix before reducing typography below accessibility limits." No shrink-to-fit.
6. **Controlled personalization** — for each slide, `personalizeSlide` server fn rewrites only fields listed in `editable_fields`. `locked_fields` (logos, legal, stats, protected brand tokens) pass through verbatim. Every change is logged to `ai_change_log`.
7. **Assemble deck** — write `deck_slides` rows in order.
8. **Editor** — `/decks/$id` renders ScaledSlide at 1920×1080 with overview grid, module inspector (shows SF/MF/MV/LF for the slide), per-field accept/revert on AI edits, "swap variant" / "swap module" actions. A right-side chat assistant scoped to the current deck.
9. **QA gates (from Section 25)** — automated checks on export: capacity compliance, locked-field integrity, placeholder completeness, source citations present, expired module warning, brand-mode consistency.
10. **Export (stub in MVP)** — PPTX + PDF buttons; wired to background job in phase 2. Data model is export-ready: ordered `deck_slides` + resolved layout id + component values → deterministic pptxgenjs render.

## Module / layout renderer contract

Each **Layout Framework** is a React component whose props are the zone map from the Atlas (LF-01 single-focus, LF-08 three-column, LF-09 asymmetric mosaic, LF-16 matrix/quadrant, etc.). Each **Module Variant** is a small React component that consumes a typed content object and renders it into a chosen Layout Framework:

```ts
export const mvChallengeThreeCards = defineVariant({
  id: "MV-CTX-CARDS-3",
  family: "MF-02",
  permittedLayouts: ["LF-08", "LF-09"],
  capacity: { cards: { min: 3, max: 3 }, cardTitle: 40, cardBody: 140 },
  fallbackVariantId: "MV-CTX-CARDS-2",
  editableFields: ["title", "cards[].title", "cards[].body"],
  lockedFields: ["footer.logo", "footer.source_style"],
  render: (props, Layout) => <Layout zones={{ ... }} />,
});
```

`locked_fields` enforcement lives in the server: `updateSlideField` rejects writes to any locked path, so the AI cannot bypass it.

## AI plumbing

- Provider: `src/lib/ai-gateway.server.ts` (Lovable AI Gateway helper).
- Default model: `google/gemini-3-flash-preview`.
- `Output.object` schemas kept small and flat (no length bounds — capacity rules enforced in code post-parse); guarded with `NoObjectGeneratedError` fallback.
- Server functions in `src/lib/*.functions.ts`:
  - `resolveArchetype`, `planSections`, `selectModule`, `fitVariant`, `personalizeSlide`, `explainChange`, `qaDeck`.
- Chat route `src/routes/api/chat.ts` powers deck-scoped assistant via `useChat` + `DefaultChatTransport`.

## What we're porting from Slides Creator

- `ScaledSlide` (1920×1080 scale-to-fit)
- `SlideLayout`, `SlideOverviewGrid`, `SlideThumbnail`
- `PresenterView`, `PresentationMode`, `FloatingMenu`
- `deckStore` (Zustand) — reshaped as editor UI state; server data goes through TanStack Query
- `ChatPanel` / `slideAgentClient` pattern for the deck-scoped assistant
- `deckImport` for future PPTX ingest (phase 2)

## Phased build

**Phase 1 — Foundations (this plan starts here)**
- Enable Lovable Cloud, auth, roles
- Migrations for taxonomy + runtime tables + seed data from your two docs (SF-01..SF-16, LF-01..LF-24, MF family stubs, ~30 seed module variants across the 6 module families most needed for MVP briefs)
- Layout Framework renderers for the 8 most-used LFs (LF-01 focus, LF-02 title+support, LF-04 two-column, LF-08 three-column, LF-09 mosaic, LF-14 timeline, LF-16 matrix, LF-24 closing)
- ScaledSlide + Overview grid + typography classes from the slides-app guidance
- `/atlas` browsable taxonomy

**Phase 2 — Brief → Assembly**
- Brief wizard, `resolveArchetype` / `planSections` / `selectModule` / `fitVariant` / `personalizeSlide`
- Deck editor with per-field accept/revert, swap-variant, swap-module
- Deck-scoped AI chat
- Library search (industry / division / sales-stage / approval)

**Phase 3 — Governance, Export, Directory intelligence**
- Full approval workflow (per Section 30)
- PPTX export (pptxgenjs) + PDF export
- QA gates from Section 25 as blocking checks
- Related-slide graph, duplicate detection, expired-content flags
- US Letter / A4 document families (per Section 27) — brief → e-brochure / product brief / adapter brief

## Non-negotiables encoded in code

Straight from your Atlas:
- Typography never shrunk below accessibility floor to fit — the fitter must switch variant, split slide, or move detail to appendix instead.
- Protected brand elements (logos, legal, tokens) are locked at the module layer and rejected at the server layer, not just the UI.
- Every AI change is traceable at the field level.
- Provisional visual styling — theme tokens are wrapped in `brand_modes.tokens_json` so the rebrand swap is a data update, not a code rewrite.

## Open items I'll assume unless you say otherwise

- Default model: Gemini 3 Flash for planning + personalization.
- Roles: `admin`, `brand_reviewer`, `content_owner`, `sales`.
- MVP module-family coverage: MF-01 Opening/Orientation, MF-02 Context/Challenge, MF-03 Insight/Opportunity, plus Proof / Case Study / Closing families — enough to assemble a real 8–12 slide deck end-to-end.
- Seed data: I'll transcribe SF-01..SF-16 and LF-01..LF-24 headers from your two docs into a `taxonomy.seed.json` in this repo so it's editable in code review.

Approve and I'll start with Phase 1: Cloud + migrations + taxonomy seed + Layout Framework renderers + `/atlas`.
