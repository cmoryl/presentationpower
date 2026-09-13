CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE IF NOT EXISTS public.event_venue_knowledge (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id text NOT NULL DEFAULT 'next-2026',
  city text NOT NULL,
  venue text NOT NULL DEFAULT '',
  template_family_id text,
  panel_id text,
  kind text NOT NULL CHECK (kind IN ('spec','placement','ground','substrate','lesson','outcome')),
  title text NOT NULL,
  body text NOT NULL,
  facts jsonb NOT NULL DEFAULT '{}'::jsonb,
  source text NOT NULL DEFAULT 'harvest' CHECK (source IN ('harvest','publish','lesson-log','manual')),
  fingerprint text NOT NULL UNIQUE,
  embedding vector(3072),
  model text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.event_venue_knowledge TO authenticated;
GRANT ALL ON public.event_venue_knowledge TO service_role;

ALTER TABLE public.event_venue_knowledge ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Signed-in users can read event knowledge"
  ON public.event_venue_knowledge FOR SELECT TO authenticated USING (true);

CREATE POLICY "Brand team can add event knowledge"
  ON public.event_venue_knowledge FOR INSERT TO authenticated
  WITH CHECK (
    public.has_role(auth.uid(), 'admin')
    OR public.has_role(auth.uid(), 'brand_lead')
    OR public.has_role(auth.uid(), 'brand_reviewer')
  );

CREATE POLICY "Brand team can update event knowledge"
  ON public.event_venue_knowledge FOR UPDATE TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin')
    OR public.has_role(auth.uid(), 'brand_lead')
    OR public.has_role(auth.uid(), 'brand_reviewer')
  )
  WITH CHECK (
    public.has_role(auth.uid(), 'admin')
    OR public.has_role(auth.uid(), 'brand_lead')
    OR public.has_role(auth.uid(), 'brand_reviewer')
  );

CREATE POLICY "Admins can delete event knowledge"
  ON public.event_venue_knowledge FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE INDEX IF NOT EXISTS event_venue_knowledge_city_idx
  ON public.event_venue_knowledge (city, kind);
CREATE INDEX IF NOT EXISTS event_venue_knowledge_family_idx
  ON public.event_venue_knowledge (template_family_id);
CREATE INDEX IF NOT EXISTS event_venue_knowledge_pending_idx
  ON public.event_venue_knowledge (created_at) WHERE embedding IS NULL;
CREATE INDEX IF NOT EXISTS event_venue_knowledge_embedding_idx
  ON public.event_venue_knowledge USING hnsw ((embedding::halfvec(3072)) halfvec_cosine_ops);

CREATE TRIGGER update_event_venue_knowledge_updated_at
  BEFORE UPDATE ON public.event_venue_knowledge
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE FUNCTION public.match_event_knowledge(
  query_embedding vector(3072),
  match_count int DEFAULT 8,
  filter_city text DEFAULT NULL,
  filter_kind text DEFAULT NULL
)
RETURNS TABLE (
  id uuid,
  event_id text,
  city text,
  venue text,
  template_family_id text,
  panel_id text,
  kind text,
  title text,
  body text,
  facts jsonb,
  source text,
  similarity float
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    k.id, k.event_id, k.city, k.venue, k.template_family_id, k.panel_id,
    k.kind, k.title, k.body, k.facts, k.source,
    1 - (k.embedding::halfvec(3072) <=> query_embedding::halfvec(3072)) AS similarity
  FROM public.event_venue_knowledge k
  WHERE k.embedding IS NOT NULL
    AND (filter_city IS NULL OR k.city = filter_city)
    AND (filter_kind IS NULL OR k.kind = filter_kind)
  ORDER BY k.embedding::halfvec(3072) <=> query_embedding::halfvec(3072)
  LIMIT match_count;
$$;

REVOKE ALL ON FUNCTION public.match_event_knowledge(vector(3072), int, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.match_event_knowledge(vector(3072), int, text, text) TO authenticated, service_role;