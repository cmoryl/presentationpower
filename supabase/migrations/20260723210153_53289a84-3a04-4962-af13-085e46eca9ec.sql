-- 1. Create table
CREATE TABLE public.approved_print_variants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  template_kind text NOT NULL CHECK (template_kind = ANY (ARRAY['case-study','spotlight','ebrochure','adaptor-brief'])),
  division_id text REFERENCES public.brand_modes(id) ON DELETE SET NULL,
  title text NOT NULL,
  description text,
  thumbnail_url text,
  content jsonb NOT NULL DEFAULT '{}'::jsonb,
  context jsonb NOT NULL DEFAULT '{}'::jsonb,
  source_asset_id uuid REFERENCES public.print_assets(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'draft' CHECK (status = ANY (ARRAY['draft','published','archived'])),
  order_index int NOT NULL DEFAULT 0,
  download_count int NOT NULL DEFAULT 0,
  duplicate_count int NOT NULL DEFAULT 0,
  published_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  published_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX approved_print_variants_kind_idx ON public.approved_print_variants(template_kind);
CREATE INDEX approved_print_variants_division_idx ON public.approved_print_variants(division_id);
CREATE INDEX approved_print_variants_status_idx ON public.approved_print_variants(status);

-- 2. Grants
GRANT SELECT, INSERT, UPDATE, DELETE ON public.approved_print_variants TO authenticated;
GRANT ALL ON public.approved_print_variants TO service_role;

-- 3. RLS
ALTER TABLE public.approved_print_variants ENABLE ROW LEVEL SECURITY;

-- 4. Policies
-- Any authenticated user can read published variants
CREATE POLICY "Authenticated read published variants"
  ON public.approved_print_variants
  FOR SELECT TO authenticated
  USING (status = 'published' OR public.has_role(auth.uid(), 'admin'::app_role));

-- Admin-only write
CREATE POLICY "Admins insert variants"
  ON public.approved_print_variants
  FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins update variants"
  ON public.approved_print_variants
  FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins delete variants"
  ON public.approved_print_variants
  FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

-- 5. updated_at trigger
CREATE TRIGGER approved_print_variants_set_updated_at
  BEFORE UPDATE ON public.approved_print_variants
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 6. Suggestions table (division leads nominate their own drafts)
CREATE TABLE public.approved_print_suggestions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  asset_id uuid NOT NULL REFERENCES public.print_assets(id) ON DELETE CASCADE,
  suggested_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  note text,
  status text NOT NULL DEFAULT 'pending' CHECK (status = ANY (ARRAY['pending','approved','rejected'])),
  reviewed_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  reviewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX approved_print_suggestions_status_idx ON public.approved_print_suggestions(status);
CREATE INDEX approved_print_suggestions_asset_idx ON public.approved_print_suggestions(asset_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.approved_print_suggestions TO authenticated;
GRANT ALL ON public.approved_print_suggestions TO service_role;

ALTER TABLE public.approved_print_suggestions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users insert own suggestions"
  ON public.approved_print_suggestions
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = suggested_by);

CREATE POLICY "Users read own suggestions or admins read all"
  ON public.approved_print_suggestions
  FOR SELECT TO authenticated
  USING (auth.uid() = suggested_by OR public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins update suggestions"
  ON public.approved_print_suggestions
  FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users delete own pending suggestions or admins delete any"
  ON public.approved_print_suggestions
  FOR DELETE TO authenticated
  USING (
    (auth.uid() = suggested_by AND status = 'pending')
    OR public.has_role(auth.uid(), 'admin'::app_role)
  );

CREATE TRIGGER approved_print_suggestions_set_updated_at
  BEFORE UPDATE ON public.approved_print_suggestions
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();