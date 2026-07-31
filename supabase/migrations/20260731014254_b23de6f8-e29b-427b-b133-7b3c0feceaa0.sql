DROP FUNCTION IF EXISTS public.match_brand_chunks(vector, integer, text, text[]);

CREATE OR REPLACE FUNCTION public.match_brand_chunks(
  query_embedding vector,
  match_count integer DEFAULT 8,
  filter_division text DEFAULT NULL,
  filter_source_types text[] DEFAULT NULL,
  filter_source_weights jsonb DEFAULT NULL
)
RETURNS TABLE(
  id uuid,
  asset_id uuid,
  division_id text,
  content text,
  tags text[],
  source_type text,
  similarity double precision,
  weighted_similarity double precision
)
LANGUAGE sql
STABLE
SET search_path TO 'public'
AS $$
  WITH scored AS (
    SELECT
      c.id,
      c.asset_id,
      c.division_id,
      c.content,
      c.tags,
      c.source_type,
      1 - (c.embedding::halfvec(3072) <=> query_embedding::halfvec(3072)) AS similarity,
      COALESCE(
        NULLIF(filter_source_weights ->> COALESCE(c.source_type, ''), '')::double precision,
        1.0
      ) AS weight,
      (filter_division IS NOT NULL AND c.division_id IS NULL) AS is_generic
    FROM public.brand_asset_chunks c
    WHERE c.embedding IS NOT NULL
      AND (
        filter_division IS NULL
        OR c.division_id = filter_division
        OR c.division_id IS NULL
      )
      AND (filter_source_types IS NULL OR c.source_type = ANY(filter_source_types))
  )
  SELECT
    s.id,
    s.asset_id,
    s.division_id,
    s.content,
    s.tags,
    s.source_type,
    s.similarity,
    s.similarity * s.weight AS weighted_similarity
  FROM scored s
  ORDER BY
    s.is_generic,
    s.similarity * s.weight DESC
  LIMIT match_count;
$$;

GRANT EXECUTE ON FUNCTION public.match_brand_chunks(vector, integer, text, text[], jsonb) TO authenticated, anon, service_role;