# Division-Aware Library Previews

Today every library card renders the same "Acme Corp / Life sciences" placeholder text regardless of brand mode. Only colors and logos change. This plan makes the **text on the preview slides** reflect the selected division (Life Sciences, GlobalLink, DataForce, Trial Interactive, etc.) — headline copy, stats, quotes, case-study story, agenda topics, service lines, industry chips.

## What the user will see

- Pick "Life Sciences" in the library brand switcher → preview slides talk about regulated content, 28 markets, clinical launches; case cards show the pharma case study; stats show `38%` and `0 regulatory reopenings`.
- Pick "GlobalLink" → the same layouts now show the SaaS/continuous-localization story, `18 languages`, `0 release delays`.
- Pick "DataForce" → frontier AI lab story, `3.1M pairs · 42 langs`, annotation stats.
- Pick "TransPerfect (Enterprise)" → the current neutral corporate content stays.

Layouts, spacing, and structure are unchanged. Only the words, numbers, and industry tags swap.

## How it works (technical)

1. **New resolver `seedDivisionContent(variantId, brief, sectionName, brandModeId)`** in `src/lib/deck-store.ts`
   - Wraps existing `seedContent()` and post-processes the returned object.
   - Pulls division context: `BRAND_PROFILES[brandModeId]` (industries, serviceLines, tags) + `pickCaseStudy(brandModeId)` from `src/lib/case-studies.ts`.
   - Overlays per-family fields on the placeholder object:
     - `MV-CASE-*` → `headline / story / metric / quote / attribution` from the picked case study.
     - `MV-PROOF-STATS-*` → `items[]` from `caseStudy.stats`.
     - `MV-PROOF-TESTIMONIAL` → `quote / attribution / role`.
     - `MV-PROOF-LOGO-*` / `MV-CLIENT-*` → `pickProofLogos(brandModeId)` names.
     - `MV-CTX-*` (industries/segments) → `profile.contentScope.industries`.
     - `MV-SOL-PILLARS-*` / `MV-OFFER-*` → `profile.contentScope.serviceLines`.
     - `MV-COVER-*`, `MV-OP-AGENDA-*`, `MV-OP-INTRO-*` → division name into `subtitle`/`meta`; agenda topics derived from serviceLines.
     - `MV-QUOTE-*` → case-study quote.
     - Any variant not in the map → returns `seedContent()` output unchanged.
   - Pure function, synchronous, no async / no DB call — safe to run per-card in the grid.

2. **Update `src/routes/library.tsx`** (two call sites, ~L468 and ~L766)
   - Replace `seedContent(variant.id, SAMPLE_BRIEF, ...)` with `seedDivisionContent(variant.id, brief, section, brandId)`.
   - Derive `brief` from the currently-selected brand: keep `SAMPLE_BRIEF` shape but set `brandModeId = scopeBrand?.id ?? tpMaster.id` and `industry = profile.contentScope.industries[0] ?? "Life sciences"`, `prospect` from the case study's `client`.
   - Compute the resolved brief once per `scopeBrandId` change using `useMemo` — grid cards read the same object.

3. **Case-study coverage check** (`src/lib/case-studies.ts`)
   - The 6 existing entries cover: Life Sciences, AI/ML, SaaS/Tech, Financial Services, Retail, Client-partnership.
   - Add 3-4 new entries to fill gaps for divisions that currently fall back to Life Sciences:
     - `cs-legal-ediscovery` (TP Legal Solutions) — regulated e-discovery, review acceleration.
     - `cs-media-dubbing` (TP Media) — dubbing/subtitling at scale.
     - `cs-marketing-transcreation` (TP Global Marketing) — transcreation, campaign velocity.
     - `cs-trial-interactive-etmf` (Trial Interactive) — eTMF study start-up.
   - Each follows the existing `CaseStudy` shape (headline, story, quote, stats[3]).

4. **No changes to** `VariantRenderer`, `taxonomy.ts`, `brand-profiles.ts`, or PPTX export — the overlay only injects existing content-shape fields that renderers already read.

## Out of scope (deliberately)

- No async KB / RAG retrieval into library previews. Reason: 50+ cards render at once; per-card `knowledge_entries` lookups would need caching + loading UI. This plan uses the already-in-memory `BRAND_PROFILES` + `CASE_STUDIES` which is instant.
- No changes to the `/brief/new` flow — that pipeline already has full KB retrieval.
- No new imagery — imagery kits stay as-is; only text swaps.

## Verification

- Open `/library`, cycle through brand modes: Enterprise → Life Sciences → GlobalLink → DataForce → Trial Interactive → TP Legal → TP Media.
- Confirm at least these families visibly change text: `MV-CASE-STORY`, `MV-PROOF-STATS-3`, `MV-QUOTE-POSTER`, `MV-CTX-CARDS-3`, `MV-SOL-PILLARS-3`, `MV-OP-AGENDA-*`.
- Click into the lightbox on 2-3 cards per brand to verify content coherence at full size.
- Run typecheck; no `VariantRenderer` prop changes so no downstream type churn expected.
