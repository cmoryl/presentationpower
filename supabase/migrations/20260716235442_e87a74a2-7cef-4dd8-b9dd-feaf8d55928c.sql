CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE public.brand_assets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  division_id text,
  entity_id uuid,
  entity_type text,
  kind text NOT NULL DEFAULT 'pdf',
  title text NOT NULL,
  description text,
  url text,
  source_filename text,
  storage_path text,
  tags text[] NOT NULL DEFAULT ARRAY[]::text[],
  extracted_text text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.brand_assets TO authenticated;
GRANT ALL ON public.brand_assets TO service_role;

ALTER TABLE public.brand_assets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can read brand_assets" ON public.brand_assets
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can insert brand_assets" ON public.brand_assets
  FOR INSERT TO authenticated WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can update brand_assets" ON public.brand_assets
  FOR UPDATE TO authenticated USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can delete brand_assets" ON public.brand_assets
  FOR DELETE TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER brand_assets_set_updated_at
  BEFORE UPDATE ON public.brand_assets
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX brand_assets_division_idx ON public.brand_assets(division_id);
CREATE INDEX brand_assets_entity_idx ON public.brand_assets(entity_type, entity_id);
CREATE INDEX brand_assets_tags_idx ON public.brand_assets USING gin(tags);

CREATE TABLE public.brand_asset_chunks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  asset_id uuid NOT NULL REFERENCES public.brand_assets(id) ON DELETE CASCADE,
  division_id text,
  chunk_index integer NOT NULL,
  content text NOT NULL,
  embedding vector(3072),
  tags text[] NOT NULL DEFAULT ARRAY[]::text[],
  token_count integer,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.brand_asset_chunks TO authenticated;
GRANT ALL ON public.brand_asset_chunks TO service_role;

ALTER TABLE public.brand_asset_chunks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can read brand_asset_chunks" ON public.brand_asset_chunks
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can insert brand_asset_chunks" ON public.brand_asset_chunks
  FOR INSERT TO authenticated WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can update brand_asset_chunks" ON public.brand_asset_chunks
  FOR UPDATE TO authenticated USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can delete brand_asset_chunks" ON public.brand_asset_chunks
  FOR DELETE TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));

CREATE INDEX brand_chunks_asset_idx ON public.brand_asset_chunks(asset_id);
CREATE INDEX brand_chunks_division_idx ON public.brand_asset_chunks(division_id);
CREATE INDEX brand_chunks_tags_idx ON public.brand_asset_chunks USING gin(tags);
CREATE INDEX brand_chunks_embedding_idx
  ON public.brand_asset_chunks
  USING hnsw ((embedding::halfvec(3072)) halfvec_cosine_ops);

CREATE OR REPLACE FUNCTION public.match_brand_chunks(
  query_embedding vector(3072),
  match_count integer DEFAULT 8,
  filter_division text DEFAULT NULL
)
RETURNS TABLE (
  id uuid,
  asset_id uuid,
  division_id text,
  content text,
  tags text[],
  similarity float
)
LANGUAGE sql STABLE
SET search_path = public
AS $$
  SELECT
    c.id,
    c.asset_id,
    c.division_id,
    c.content,
    c.tags,
    1 - (c.embedding::halfvec(3072) <=> query_embedding::halfvec(3072)) AS similarity
  FROM public.brand_asset_chunks c
  WHERE c.embedding IS NOT NULL
    AND (filter_division IS NULL OR c.division_id = filter_division)
  ORDER BY c.embedding::halfvec(3072) <=> query_embedding::halfvec(3072)
  LIMIT match_count;
$$;