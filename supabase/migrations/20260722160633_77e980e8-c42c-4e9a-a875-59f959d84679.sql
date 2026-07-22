-- Enum for module save kind
DO $$ BEGIN
  CREATE TYPE public.module_save_kind AS ENUM ('populated','template');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Enum for surface kind
DO $$ BEGIN
  CREATE TYPE public.surface_kind AS ENUM ('brochure','onepager','social','email');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ============ saved_modules ============
CREATE TABLE public.saved_modules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  variant_id text NOT NULL,
  save_kind public.module_save_kind NOT NULL DEFAULT 'populated',
  title text NOT NULL,
  description text,
  content jsonb NOT NULL DEFAULT '{}'::jsonb,
  brand_mode text,
  sub_company text,
  division_id text,
  backdrop jsonb,
  role text,
  tags text[] NOT NULL DEFAULT '{}'::text[],
  thumbnail_url text,
  source_deck_id uuid,
  source_slide_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_saved_modules_owner ON public.saved_modules(owner_id);
CREATE INDEX idx_saved_modules_variant ON public.saved_modules(variant_id);
CREATE INDEX idx_saved_modules_tags ON public.saved_modules USING gin(tags);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.saved_modules TO authenticated;
GRANT ALL ON public.saved_modules TO service_role;

ALTER TABLE public.saved_modules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners manage their saved modules"
  ON public.saved_modules FOR ALL
  USING (auth.uid() = owner_id)
  WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Admins can view all saved modules"
  ON public.saved_modules FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER saved_modules_set_updated_at
  BEFORE UPDATE ON public.saved_modules
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============ surfaces ============
CREATE TABLE public.surfaces (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  kind public.surface_kind NOT NULL,
  format text NOT NULL,
  title text NOT NULL DEFAULT 'Untitled surface',
  brand_mode_id text,
  archetype_id text,
  sub_company text,
  context jsonb NOT NULL DEFAULT '{}'::jsonb,
  modules jsonb NOT NULL DEFAULT '[]'::jsonb,
  meta jsonb NOT NULL DEFAULT '{}'::jsonb,
  is_template boolean NOT NULL DEFAULT false,
  thumbnail_url text,
  source_deck_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_surfaces_owner ON public.surfaces(owner_id);
CREATE INDEX idx_surfaces_kind ON public.surfaces(kind);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.surfaces TO authenticated;
GRANT ALL ON public.surfaces TO service_role;

ALTER TABLE public.surfaces ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners manage their surfaces"
  ON public.surfaces FOR ALL
  USING (auth.uid() = owner_id)
  WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Admins can view all surfaces"
  ON public.surfaces FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Templates are readable by any authenticated user"
  ON public.surfaces FOR SELECT
  TO authenticated
  USING (is_template = true);

CREATE TRIGGER surfaces_set_updated_at
  BEFORE UPDATE ON public.surfaces
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============ surface_versions ============
CREATE TABLE public.surface_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  surface_id uuid NOT NULL REFERENCES public.surfaces(id) ON DELETE CASCADE,
  owner_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  label text,
  snapshot jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_surface_versions_surface ON public.surface_versions(surface_id, created_at DESC);

GRANT SELECT, INSERT, DELETE ON public.surface_versions TO authenticated;
GRANT ALL ON public.surface_versions TO service_role;

ALTER TABLE public.surface_versions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners manage their surface versions"
  ON public.surface_versions FOR ALL
  USING (auth.uid() = owner_id)
  WITH CHECK (auth.uid() = owner_id);