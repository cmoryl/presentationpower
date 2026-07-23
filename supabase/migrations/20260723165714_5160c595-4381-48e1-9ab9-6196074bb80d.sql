
-- ============================================================
-- 1. print_assets
-- ============================================================
CREATE TABLE public.print_assets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  kind text NOT NULL DEFAULT 'case-study',
  title text NOT NULL,
  brand_mode_id text REFERENCES public.brand_modes(id),
  brief_id uuid REFERENCES public.briefs(id) ON DELETE SET NULL,
  source_deck_id uuid REFERENCES public.decks(id) ON DELETE SET NULL,
  source_slide_ids uuid[] NOT NULL DEFAULT '{}',
  source_module_ids text[] NOT NULL DEFAULT '{}',
  status text NOT NULL DEFAULT 'draft',
  content jsonb NOT NULL DEFAULT '{}'::jsonb,
  context jsonb NOT NULL DEFAULT '{}'::jsonb,
  share_token text UNIQUE,
  shared_at timestamptz,
  share_expires_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT print_assets_kind_check CHECK (kind IN ('case-study','spotlight','ebrochure','adaptor-brief'))
);

CREATE INDEX print_assets_owner_idx ON public.print_assets(owner_id);
CREATE INDEX print_assets_kind_idx ON public.print_assets(kind);
CREATE INDEX print_assets_share_token_idx ON public.print_assets(share_token) WHERE share_token IS NOT NULL;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.print_assets TO authenticated;
GRANT ALL ON public.print_assets TO service_role;

ALTER TABLE public.print_assets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own print_assets"
  ON public.print_assets
  FOR ALL
  TO authenticated
  USING (auth.uid() = owner_id)
  WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Admins read all print_assets"
  ON public.print_assets
  FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER print_assets_updated_at
  BEFORE UPDATE ON public.print_assets
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============================================================
-- 2. division_stats
-- ============================================================
CREATE TABLE public.division_stats (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  division_id text NOT NULL,
  label text NOT NULL,
  value text NOT NULL,
  unit text,
  caption text,
  source text,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX division_stats_division_idx ON public.division_stats(division_id, sort_order);

GRANT SELECT ON public.division_stats TO authenticated;
GRANT ALL ON public.division_stats TO service_role;

ALTER TABLE public.division_stats ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated read division_stats"
  ON public.division_stats
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins manage division_stats"
  ON public.division_stats
  FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER division_stats_updated_at
  BEFORE UPDATE ON public.division_stats
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============================================================
-- 3. division_quotes
-- ============================================================
CREATE TABLE public.division_quotes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  division_id text NOT NULL,
  quote text NOT NULL,
  author text,
  role text,
  company text,
  source text,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX division_quotes_division_idx ON public.division_quotes(division_id, sort_order);

GRANT SELECT ON public.division_quotes TO authenticated;
GRANT ALL ON public.division_quotes TO service_role;

ALTER TABLE public.division_quotes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated read division_quotes"
  ON public.division_quotes
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins manage division_quotes"
  ON public.division_quotes
  FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER division_quotes_updated_at
  BEFORE UPDATE ON public.division_quotes
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============================================================
-- 4. get_shared_print_asset function
-- ============================================================
CREATE OR REPLACE FUNCTION public.get_shared_print_asset(_token text)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _a public.print_assets%ROWTYPE;
  _brief jsonb;
BEGIN
  IF _token IS NULL OR length(_token) < 16 THEN
    RETURN NULL;
  END IF;

  SELECT * INTO _a FROM public.print_assets WHERE share_token = _token LIMIT 1;
  IF NOT FOUND THEN
    RETURN NULL;
  END IF;

  IF _a.share_expires_at IS NOT NULL AND _a.share_expires_at <= now() THEN
    RETURN jsonb_build_object('status','expired');
  END IF;

  IF _a.brief_id IS NOT NULL THEN
    SELECT to_jsonb(b) INTO _brief FROM (
      SELECT prospect, industry, audience, brand_mode_id, sub_company
      FROM public.briefs WHERE id = _a.brief_id
    ) b;
  END IF;

  RETURN jsonb_build_object(
    'status','active',
    'id', _a.id,
    'kind', _a.kind,
    'title', _a.title,
    'brand_mode_id', _a.brand_mode_id,
    'content', _a.content,
    'context', _a.context,
    'shared_at', _a.shared_at,
    'expires_at', _a.share_expires_at,
    'brief', _brief
  );
END;
$$;
