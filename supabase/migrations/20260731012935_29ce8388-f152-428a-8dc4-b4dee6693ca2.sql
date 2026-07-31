-- 1. Source-type discriminator on chunks and assets
ALTER TABLE public.brand_asset_chunks
  ADD COLUMN IF NOT EXISTS source_type text NOT NULL DEFAULT 'other';
ALTER TABLE public.brand_assets
  ADD COLUMN IF NOT EXISTS source_type text NOT NULL DEFAULT 'other';

-- Backfill from existing metadata/tags
UPDATE public.brand_asset_chunks SET source_type = CASE
  WHEN metadata->>'source' = 'pdf_extraction' THEN 'pdf'
  WHEN metadata->>'source' = 'imported_deck' THEN 'pptx'
  WHEN metadata->>'source' = 'brandhub-seed' THEN 'brandhub'
  WHEN 'pdf_extraction' = ANY(tags) THEN 'pdf'
  WHEN 'imported_deck' = ANY(tags) THEN 'pptx'
  ELSE 'other' END;

UPDATE public.brand_assets SET source_type = CASE
  WHEN kind = 'pptx' THEN 'pptx'
  WHEN kind = 'pdf' THEN 'pdf'
  WHEN metadata->>'source' = 'brandhub-seed' THEN 'brandhub'
  ELSE 'other' END;

CREATE INDEX IF NOT EXISTS brand_chunks_source_type_idx
  ON public.brand_asset_chunks (source_type);

-- 2. Repair legacy mis-mapped deck division (slug prefix strip bug)
UPDATE public.brand_asset_chunks SET division_id = 'bm-enterprise'
  WHERE source_type = 'pptx' AND division_id = 'master';
UPDATE public.brand_assets SET division_id = 'bm-enterprise'
  WHERE source_type = 'pptx' AND division_id = 'master';

-- 3. Idempotency key: one chunk per (asset, index)
DELETE FROM public.brand_asset_chunks a
  USING public.brand_asset_chunks b
  WHERE a.asset_id = b.asset_id
    AND a.chunk_index = b.chunk_index
    AND a.ctid > b.ctid;

CREATE UNIQUE INDEX IF NOT EXISTS brand_chunks_asset_chunk_uidx
  ON public.brand_asset_chunks (asset_id, chunk_index);

-- 4. Retrieval surfaces source_type and can filter by it
DROP FUNCTION IF EXISTS public.match_brand_chunks(vector, integer, text);
CREATE OR REPLACE FUNCTION public.match_brand_chunks(
  query_embedding vector,
  match_count integer DEFAULT 8,
  filter_division text DEFAULT NULL::text,
  filter_source_types text[] DEFAULT NULL::text[]
)
RETURNS TABLE(id uuid, asset_id uuid, division_id text, content text, tags text[], source_type text, similarity double precision)
LANGUAGE sql
STABLE
SET search_path TO 'public'
AS $function$
  SELECT
    c.id,
    c.asset_id,
    c.division_id,
    c.content,
    c.tags,
    c.source_type,
    1 - (c.embedding::halfvec(3072) <=> query_embedding::halfvec(3072)) AS similarity
  FROM public.brand_asset_chunks c
  WHERE c.embedding IS NOT NULL
    AND (
      filter_division IS NULL
      OR c.division_id = filter_division
      OR c.division_id IS NULL
    )
    AND (filter_source_types IS NULL OR c.source_type = ANY(filter_source_types))
  ORDER BY
    (filter_division IS NOT NULL AND c.division_id IS NULL),
    c.embedding::halfvec(3072) <=> query_embedding::halfvec(3072)
  LIMIT match_count;
$function$;