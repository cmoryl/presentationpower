
# Full BrandHUB Integration

Bringing the entire BrandHUB knowledge system into this project so every division, sub-brand, brand guide, and uploaded PDF/brochure feeds our deck personalization and Oracle retrieval.

The source project is BrandHUB (workspace project, visited via cross-project tools). It holds 30 Oracle knowledge rows, 40 brand_intelligence rows (one per division/product/event), a full Oracle synthesis, per-division guide data in `src/data/`, and per-division assets under `public/canva-master-reference/`, `public/transperfect/`, `public/booths/`, `public/knowledge/`.

Because cross-project file reads paginate at ~400 lines and the seed is 8,645 lines, ingestion runs in phases across turns. Each phase leaves the app fully working; nothing is half-wired.

## Phase 1 — Data plumbing + Oracle + Knowledge Base (this turn)

1. Schema
   - Add `brand_assets` table: `id, division_id, kind (pdf|brochure|guide|logo|image|other), title, description, url (CDN), source_filename, tags text[], extracted_text text, created_at`.
   - Add `brand_asset_chunks` table for RAG: `id, asset_id, chunk_index, content, embedding vector(3072), tags text[], division_id, created_at`, pgvector index.
   - Extend `brand_intelligence` if columns from BrandHUB don't already exist (they do — 15 cols); confirm and map.
   - GRANT + RLS on both new tables (admin write, authenticated read).

2. Data import (via `supabase--insert`)
   - Read `public/knowledge-export/database-seed.json` from BrandHUB in chunks, rebuild locally as `/tmp/brandhub-seed.json`, then bulk insert:
     - 1 row into `oracle_intelligence` (upsert on organization_id).
     - 30 rows into `oracle_knowledge_base`.
     - 40 rows into `brand_intelligence` (one per entity — TransPerfect master, GlobalLink, Legal, Life Sciences, Media, Games, Digital, DataForce, Reef suite, regional, etc.).
   - Preserve UUIDs so cross-references inside `bias_awareness_insights.entity_scores` still resolve.

3. Static knowledge assets
   - Copy `public/knowledge/**` (voiceover captions, `icon-iconography-history.md`, `claude-for-designers.html`) into this project's `public/knowledge/`.
   - Copy `public/transperfect/*.html` (Canva audits, template inventories) into `public/transperfect/`.
   - Copy `public/canva-master-reference/next-2026-color-palette.{csv,json,txt}` and `next-2026.html`.

## Phase 2 — Per-division brand guides (next turn)

4. Extend `src/lib/brand-guides.ts` with one `BrandGuide` per division sourced from BrandHUB's `src/data/demoBrandHub.ts`, `demoGuides.ts`, and the 40 brand_intelligence rows:
   - GlobalLink (+ Enterprise, Live, Portal, NOW, Strings, Web, CCMS, Share, Media, Scribe)
   - Legal (+ Reef suite: ReefReview, ReefClaims, ReefStream, ReefTranslate, DigitalReef, ReefExhibit, ReefCentral, ReefDiscovery, ReefECA, VirtualReef)
   - Life Sciences (+ Trial Interactive, LMK)
   - Media (+ Creator, Inspector, Conductor, Director)
   - Games, Digital, DataForce, IP, Health, Legal Tech
   - Portfolio: The Mill, Bear Down, Avatria, Unbabel, Sterling, Paybooks, Wordbee
5. Add the division logos already in `public/canva-master-reference/*.png` as `.asset.json` pointers.
6. Update `src/routes/knowledge.brand-guides.tsx` and `.$slug.tsx` to render division-scoped colors, sub-brands, brand_intelligence summary, and linked knowledge entries.
7. Add a division switcher on the brand-guides index that filters by `brand_intelligence.entity_type`.

## Phase 3 — PDFs & brochures + vector RAG (next turn)

8. Admin uploader on `/admin/knowledge` (or `/admin/oracle`) for PDFs/brochures per division:
   - Upload to Lovable Storage bucket `brand-assets` (private, signed URLs for admin, public URLs opt-in per asset).
   - Server function `ingestBrandAsset` extracts text via pdfjs (Worker-compatible), chunks to ~1200 chars with 200 overlap, embeds each chunk via Lovable AI Gateway (`google/gemini-embedding-001`, 3072 dims), stores in `brand_asset_chunks`.
   - Batch script `scripts/seed-brandhub-assets.ts` bulk-ingests all BrandHUB PDFs the user uploads into this project (I'll wait for the actual PDF files — they aren't in the BrandHUB repo, they're in the user's Basecamp/Canva).

9. RAG retrieval
   - Extend `retrieveKnowledgeForBrief` (already exists in `src/lib/admin.functions.ts`) to embed the brief context and cosine-match against `brand_asset_chunks` filtered by `division_id` + tags, alongside the existing keyword scoring on `oracle_knowledge_base` and `knowledge_entries`.
   - Return combined snippets to `personalizeSlides`; system prompt already accepts `knowledgeSnippets`.

10. UI surfacing
    - Per-division brand-guide page shows: guide colors/type/logo + linked PDFs + brand_intelligence card + Oracle snippets.
    - `/brief/new` "Palette Lab" section shows which brand_intelligence + asset chunks will inform generation for the chosen division.

## Technical Details

- Cross-project file reads paginate at 400 lines; I'll stream the seed in ~22 chunks and reconstruct locally, then `supabase--insert` in batches (200 rows/batch).
- `brand_asset_chunks.embedding` uses `vector(3072)` with `hnsw ((embedding::halfvec(3072)) halfvec_cosine_ops)` per pgvector limits.
- Existing `brand_intelligence` table is 15 columns and mirrors BrandHUB's schema; direct insert with the source UUIDs.
- `oracle_intelligence` in this project has 21 columns; BrandHUB rows have compatible JSONB shape. Any extra columns get null.
- PDFs live on user's Basecamp — I need them uploaded here (chat file attach or Storage) to ingest. I'll wire the upload UI in Phase 3 and ingest whatever's present; nothing hardcoded per file.
- No voice integration (per memory).
- All admin ingestion functions gated by `has_role(uid,'admin')`.

## What I need from you

- Confirm plan.
- Phase 3 needs the actual PDFs/brochures — do you have them ready to upload here, or should I finish Phases 1–2 and ship the uploader so you drop them in when convenient?
