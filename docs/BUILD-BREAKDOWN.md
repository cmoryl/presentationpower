# Presentation Power — Full Build Breakdown

Backend + developer reference for the whole system. Everything here reflects the current
repo state (routes, server functions, tables, pipelines, scripts).

---

## 1. Runtime & architecture

| Layer | Tech | Notes |
| --- | --- | --- |
| Framework | TanStack Start v1 (Router v1, React 19) | file routes in `src/routes`, generated `src/routeTree.gen.ts` (never edit) |
| Build | Vite 8 + Tailwind v4 (`src/styles.css`) | no `tailwind.config.js`; tokens in `@theme` |
| Server runtime | Cloudflare Worker (edge, `nodejs_compat`) | no child_process, sharp, canvas, native addons |
| Backend | Lovable Cloud (Postgres + Auth + Storage + pgvector) | 54 public tables, RLS on all |
| AI | Lovable AI Gateway (`LOVABLE_API_KEY`) | chat, vision, embeddings — no user keys |
| State | Zustand (`src/lib/deck-store.ts`) + TanStack Query | deck editing is client-store-driven, persisted via server fns |

**Boundaries**

- `src/lib/*.functions.ts` — typed RPC (`createServerFn`) called from components/loaders. 193 exported server functions across 50 files.
- `src/lib/*.server.ts` — server-only helpers, filename-blocked from client bundles
  (`imported-deck-ingest.server.ts`, `knowledge-grounding.server.ts`, `print-synth.server.ts`,
  `team-access.server.ts`, `translation-engine.server.ts`).
- `src/routes/api/public/*` — raw HTTP, auth-bypassed on published sites
  (`pdf-index-proxy.ts`, `brandhub-seed-proxy.ts`). Both are read-only upstream proxies.
- `src/routes/mcp.ts` + `src/lib/mcp/*` — MCP server exposing 6 tools:
  `list-decks`, `get-deck`, `create-brief`, `list-print-assets`, `get-print-asset`, `list-campaign-kits`.
- `src/start.ts` — `functionMiddleware: [attachSupabaseAuth]` (bearer token on every server fn call),
  `requestMiddleware: [errorMiddleware]` (HTML 500 page via `src/lib/error-page.ts`).

**Auth model**

- Supabase email/password + Google. `profiles` auto-created by `handle_new_user()` trigger.
- Roles live in `user_roles` (`app_role` enum) — never on profiles. Checks go through
  `public.has_role(uuid, app_role)` (SECURITY DEFINER) inside RLS policies.
- `@transperfect.com` confirmed emails auto-granted `admin` via
  `grant_admin_for_transperfect_domain()` triggers on `auth.users`.
- Shared team login: `team-access.functions.ts` → `teamSignIn` gated by `TEAM_ACCESS_PASSWORD`
  with brute-force throttling in `team_access_attempts`.
- Protected server fns use `.middleware([requireSupabaseAuth])` → `context.supabase / userId / claims`.
  **Never** call those from a public route loader (prerender has no session) — call via
  `useServerFn` + `useQuery`, or put the loader under `_authenticated`.

---

## 2. Data model (public schema, RLS enabled on all 54 tables)

### Deck core
| Table | Purpose |
| --- | --- |
| `decks` | deck header: title, brand_mode_id, archetype_id, context JSONB, share_token/expiry, is_template |
| `deck_slides` | position, section_id, variant_id, layout_id, content JSONB, notes |
| `deck_versions` | snapshot history (`snapshotDeckVersion` / `restoreDeckVersion`) |
| `deck_comments`, `deck_reviews` | collaboration + review status |
| `deck_share_views` | anonymous share telemetry, written only by `record_share_view()` |
| `briefs` | intake: prospect, industry, audience, objective, length target, known facts |
| `surfaces`, `surface_versions` | generic non-deck surface store |
| `print_assets`, `approved_print_variants`, `approved_print_suggestions` | print/collateral pipeline + approval queue |
| `campaign_kits`, `saved_modules`, `slide_modules`, `library_slide_examples` | reusable module/kit library |
| `module_families`, `module_variants`, `layout_frameworks`, `section_frameworks`, `narrative_archetypes`, `brand_modes` | taxonomy (read-mostly, served by `taxonomy.functions.ts`) |

### Knowledge / RAG
| Table | Purpose |
| --- | --- |
| `brand_assets` (239) | uploaded source docs per division |
| `brand_asset_chunks` (2 049) | embedded chunks; `source_type` distinguishes doc / pptx / pdf origins |
| `knowledge_entries` (385) | curated brand knowledge, division-scoped |
| `brand_intelligence`, `oracle_knowledge_base`, `oracle_intelligence` | BrandHub-derived intel + Oracle layer |
| `pdf_extractions` | PDF ingest text + embedding state |
| `imported_decks` (12) | PPTX ingest: slides, templates, sections JSONB (masters/layouts/z-order) |
| `division_imagery` (687), `client_logos` (392), `division_stats`, `division_quotes` | asset libraries |

### Ops
`usage_events`, `ai_events`, `imagery_events`, `admin_audit_log`,
`ab_experiments` / `ab_variants` / `ab_assignments` / `ab_events`,
`globallink_config` / `globallink_share_settings` / `globallink_share_activity`,
`languages`, `glossary_terms`, `deck_translations`, `slide_translations`.

### Migration rules
Every `CREATE TABLE public.x` migration must, in order: create → `GRANT` (`authenticated`,
`service_role`, `anon` only if a policy allows anon reads) → `ENABLE ROW LEVEL SECURITY` → policies.
Grants are not optional; PostgREST returns permission errors without them.

### Security-definer RPCs (public share surface)
`get_shared_deck`, `get_shared_deck_locales`, `get_shared_deck_translations`,
`get_shared_print_asset`, `get_template_deck`, `record_share_view`, `match_brand_chunks`,
`has_role`, `handle_new_user`, `set_updated_at`, `grant_admin_for_transperfect_domain`.
Token-gated functions validate `length(token) >= 16` and enforce expiry before returning payloads.

### Storage buckets (all private, signed URLs only)
`brand-assets`, `client-logos`, `division-imagery`, `division-pptx`, `slide-media`, `slide-videos`.

### Secrets
`LOVABLE_API_KEY`, `TEAM_ACCESS_PASSWORD`, plus platform-managed `SUPABASE_*`.
Read them inside `.handler()` — never at module scope.

---

## 3. Server function map (by domain)

| File | Key exports |
| --- | --- |
| `cloud-decks.functions.ts` | saveDeckToCloud, loadCloudDeck, listMyCloudDecks, deleteCloudDeck, listTeamTemplates, getTemplateDeck, setDeckTemplateFlag |
| `deck-sharing.functions.ts` | enableDeckSharing, setDeckShareExpiry, disableDeckSharing, getSharedDeck, recordShareView, getShareAnalytics |
| `deck-versions / deck-collab / deck-analytics` | snapshot/restore, comments, review status, library analytics |
| `print-assets.functions.ts` | create/load/update/delete, applyHeroToAllPrintAssets (+ preview/undo), synthesizeCaseStudy, createPrintAssetWithBrief |
| `approved-print-variants.functions.ts` | publishAssetToLibrary, suggestPrintVariant, reviewPrintVariantSuggestion, recordApprovedVariantDownload |
| `imported-decks.functions.ts` | uploadImportedDeck, reparseImportedDeck, getImportedDeckSlides, embedImportedDecks, relinkDeckImage, sendImportedSlideToLibrary |
| `pptx-import.functions.ts` | importPowerpoint |
| `brand-assets.functions.ts` | ingestBrandAsset, searchBrandChunks, importBrandhubSeed, fetchAndImportBrandhubSeed |
| `knowledge.functions.ts`, `division-knowledge.functions.ts`, `ai-rag.functions.ts` | CRUD + getDivisionContext(s) + synthesizeKnowledgeForBrief |
| `pdf-ingest.functions.ts` | fetchPdfIndex, ingestPdfBatch, embedPdfExtractions, getPdfExtractionText |
| AI surfaces | `ai-strategist` planDeckStrategy · `ai-copilot` copilotTurn · `ai-review` reviewDeck · `art-director` critiqueDeckRhythm · `refine-slide` refineSlideWithInstruction · `populate-slide` populateSlideWithDivisionInfo · `campaign-copy` draftCampaignCopy · `ai-assets` suggestAssetsForSlide · `imagery` / `ai-image` generateBrandImage, generateBackgroundImage · `reference-assets` analyzeReferenceAssets · `prospect-context` lookupProspectContext · `personalize` personalizeSlides · `ai-oracle` oracleChat · `ai-status` hasAiKey |
| `translation.functions.ts` | translateSlide/DeckInPlace/DeckToCopy/DeckBatch, cache + locale listing, cancel/retry jobs |
| `globallink*.functions.ts` | config, connection tests, share upload, activity |
| `division-imagery / imported-imagery / client-logos` | upload, approve, sign URLs, variants, hero picking, BrandHub logo import |
| `admin.functions.ts` (24 fns) | overview, users/roles, AI + imagery analytics, A/B lab, audit log, Oracle sync, proposeAbPalettes |
| `modules.functions.ts` | review queue: submit/approve/reject/requestChanges/bulkApprove, duplicates, expiring, audit |

---

## 4. Pipelines

### 4.1 Brief → deck
`brief.new.tsx` (5-step console) → validation (`brief-validation.ts`) →
`planDeckStrategy` picks section order → `synthesizeKnowledgeForBrief` pulls division-scoped RAG →
slides materialized into the Zustand deck store → `saveDeckToCloud` → land on
`brief.$deckId.tsx` (Output Hub) / `decks.$deckId.index.tsx` (editor).

### 4.2 RAG retrieval (`src/lib/knowledge-scope.ts` — single source of truth)
- One shared `EMBEDDING_MODEL` for ingest and query; mismatches silently break recall.
- Hybrid: dense cosine via `match_brand_chunks` (halfvec 3072) + BM25 lexical, fused with RRF.
- Division filter must also admit `division_id IS NULL` (global/owner-agnostic rows).
- Per-`source_type` weights and a similarity floor; a ~25 % quota interleave guarantees
  imported-PPTX chunks surface alongside curated docs.
- Grounded generation goes through `knowledge-grounding.server.ts` (`safeGrounding`), and cited
  snippets render in `src/components/GroundingCitations.tsx`.

### 4.3 PPTX import
`pptx-import.ts` parses OOXML with `fast-xml-parser`: masters/layouts inheritance, sections
(`p14:sectionLst`), z-order, geometry, tables, chart series, SmartArt, placeholder labels,
`layoutFingerprint` per slide. Alpha-bearing WMF/EMF rasterized by `emf-raster.ts`.
Ingest shared via `imported-deck-ingest.server.ts`. Rendering: `ImportedFaithfulSlide.tsx` /
`FaithfulSlideCanvas.tsx` with `imported-backdrop.ts` for inherited backdrops.
Audit tools: `/library/imported/audit`, `/library/imported/masters`.
`imported-to-deck.ts` builds an editable native deck; "Reinterpret" maps content onto module variants.

### 4.4 PPTX export (parity is a hard requirement)
`pptx-export.ts` (~3.8k LOC) has per-variant renderers plus native pptxgenjs charts.
Supporting modules: `pptx-background.ts` (multi-band gradient ramps replacing flat scrims),
`pptx-color.ts`, `pptx-font-embed.ts`, `pptx-mapping.ts`, `pptx-parity.ts`,
`pptx-vector-pref.ts`, `logo-placement.ts` (aspect-correct in-browser measurement).
Parity is regression-tested (`pptx-parity`, `pptx-theme-snapshot`, `accent-export-parity`,
`preview-pptx-token-parity`).

### 4.5 Print / PDF
`print-capacity.ts` (overflow math) → `LayoutHealthBanner` / `PrintOverflowOverlay`,
`print-vector-text.ts`, `print-html-export.ts`, `print-asset-export.ts`, `pdf-x4.ts` (PDF/X-4),
`map-png-export.ts`. Badges: `next-badge.ts` + `/events/next/badges` at 4.58″ × 6.55″ bleed.

### 4.6 Sharing & translation
`enableDeckSharing` mints a token; public viewer `share.$token.tsx` reads only through
`get_shared_deck*` RPCs. Translations cached per (slide, locale) in `slide_translations`;
the share viewer shows a locale switcher when `listSharedLocales` returns rows.

---

## 5. Frontend structure worth knowing

- `src/lib/deck-store.ts` — `DeckSlide` / `DeckContext` types, autosave, transitions
  (`SlideTransition`), persistence contract. Additive fields only; no persist migration.
- `src/components/slide/` — `VariantRenderer.tsx` (59 variants), `ScaledSlide.tsx`,
  `SlideStage.tsx` (between-slide transitions, reduced-motion gated), `SlideLightbox`,
  `LiveEditOverlay.tsx` (inline markdown editing).
- Design tokens only: `accent-ramp.ts`, `slide-accent.ts`, `hero-variants.ts`,
  `background-library.ts`, `aurora-svg.ts`. No hardcoded color utilities.
- Hooks: `use-deck-hydrated`, `use-session-user`, `use-taxonomy`, `use-client-logos`,
  `use-print-overflow`, `use-image-drop`, `use-reduced-motion`, `use-unsaved-deck-guard`,
  `use-modal-a11y`, `use-ai-slide-populate`, `useOracleBrain`.

---

## 6. Developer workflow

```bash
bun install
bun run dev            # vite dev on :8080
bunx tsgo --noEmit     # TS-only typecheck (not tsc)
bunx vitest run        # 198 unit tests / 30 files in src/lib/__tests__
bun run test:e2e:smoke # Playwright route smoke
bun run lint
bun run build          # production Worker build
```

Maintenance scripts (`scripts/`):

| Script | Use |
| --- | --- |
| `embed-imported-decks.ts` | re-embed imported decks; `(asset_id, chunk_index)` upsert + trailing-chunk prune (idempotent) |
| `reparse-imported-decks.ts` | re-run PPTX parser over stored files after parser changes |
| `gen-taxonomy-seed.ts`, `gen-variants-chunks.ts` | seed/derive taxonomy and variant chunks |
| `rag-weight-probe.mjs`, `embed-probe.mjs`, `embed-run.mjs` | retrieval tuning + embedding diagnostics |
| `visual-regression-library.mjs`, `verify-classic-logos.mjs` | snapshot/asset verification |
| `collab-sim.mjs`, `versions-autosave-sim.mjs`, `video-smoke.mjs` | behavioural sims |

---

## 7. Invariants & gotchas

1. `.functions.ts` files stay thin — declarations only. Runtime helpers move to a `*.server.ts`
   or inside the handler; server-fn splitting deletes module-scope siblings (`ReferenceError`
   even when typecheck passes).
2. Never import `@/integrations/supabase/client.server` at module scope in a client-reachable
   file — use `await import()` inside `.handler()`. Admin client bypasses RLS; verify the caller
   (via `context.supabase` + `has_role`) before using it.
3. Never edit generated files: `src/integrations/supabase/*` (client, client.server,
   auth-middleware, auth-attacher, types), `.env`, `supabase/config.toml`, `routeTree.gen.ts`.
4. Reparsing or reworking chunk text requires a re-embed run, otherwise retrieval still serves
   old vectors.
5. Worker runtime: no `child_process`, `sharp`, `canvas`, `fs.watch`, native addons. Never set
   `ssr.external` in `vite.config.ts`.
6. Every content route needs its own `head()` with unique title/description/OG.
7. Seed data belongs in migrations as literal `INSERT`s — not page-load or server-fn seeding.
