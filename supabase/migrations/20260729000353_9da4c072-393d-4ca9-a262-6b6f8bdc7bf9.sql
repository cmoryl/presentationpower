-- 1. Backfill division_id for pdf-sourced brand assets whose entity slug was
--    unmapped (globallink-* sub-products, trial-interactive).
UPDATE public.brand_assets ba
SET division_id = m.division_id
FROM (VALUES
  ('globallink-ccms', 'bm-division'),
  ('globallink-web', 'bm-division'),
  ('globallink-live', 'bm-division'),
  ('globallink-now', 'bm-division'),
  ('globallink-strings', 'bm-division'),
  ('globallink-share', 'bm-division'),
  ('globallink-tms', 'bm-division'),
  ('trial-interactive', 'bm-trial-interactive')
) AS m(entity_slug, division_id)
WHERE ba.division_id IS NULL
  AND ba.metadata->>'entity_slug' = m.entity_slug;

-- 2. Propagate onto the embedded chunks so vector search can filter on them.
UPDATE public.brand_asset_chunks c
SET division_id = ba.division_id
FROM public.brand_assets ba
WHERE ba.id = c.asset_id
  AND c.division_id IS DISTINCT FROM ba.division_id
  AND ba.division_id IS NOT NULL;

-- 3. Mirror the extracted document text onto the companion asset row. The
--    Deep-RAG synthesis step reads full documents from
--    brand_assets.extracted_text; the pdf ingest path never populated it, so
--    that step has always seen zero documents.
UPDATE public.brand_assets ba
SET extracted_text = left(pe.extracted_text, 200000)
FROM public.pdf_extractions pe
WHERE ba.metadata->>'pdf_extraction_id' = pe.id::text
  AND ba.extracted_text IS NULL
  AND pe.extracted_text IS NOT NULL
  AND length(btrim(pe.extracted_text)) > 0;

-- 4. Untagged chunks must remain reachable under a division filter. Global /
--    master material legitimately has no division, and a future unmapped slug
--    should degrade to "less relevant", never to "invisible".
CREATE OR REPLACE FUNCTION public.match_brand_chunks(
  query_embedding vector,
  match_count integer DEFAULT 8,
  filter_division text DEFAULT NULL::text
)
RETURNS TABLE(id uuid, asset_id uuid, division_id text, content text, tags text[], similarity double precision)
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
    1 - (c.embedding::halfvec(3072) <=> query_embedding::halfvec(3072)) AS similarity
  FROM public.brand_asset_chunks c
  WHERE c.embedding IS NOT NULL
    AND (
      filter_division IS NULL
      OR c.division_id = filter_division
      OR c.division_id IS NULL
    )
  ORDER BY
    -- Exact division matches outrank untagged/global chunks at equal distance.
    (filter_division IS NOT NULL AND c.division_id IS NULL),
    c.embedding::halfvec(3072) <=> query_embedding::halfvec(3072)
  LIMIT match_count;
$function$;