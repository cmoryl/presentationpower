CREATE TYPE public.app_role AS ENUM ('admin','brand_reviewer','content_owner','sales');

CREATE TABLE public.user_roles (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL, role public.app_role NOT NULL, UNIQUE (user_id, role));
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users read own roles" ON public.user_roles FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

CREATE TABLE public.profiles (id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE, display_name text, created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now());
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users read own profile" ON public.profiles FOR SELECT TO authenticated USING (auth.uid() = id);
CREATE POLICY "Users update own profile" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id);
CREATE POLICY "Users insert own profile" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);

CREATE OR REPLACE FUNCTION public.handle_new_user() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name) VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email,'@',1))) ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END; $$;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

CREATE OR REPLACE FUNCTION public.set_updated_at() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

CREATE TABLE public.brand_modes (id text PRIMARY KEY, name text NOT NULL, description text, tokens jsonb NOT NULL DEFAULT '{}'::jsonb, created_at timestamptz NOT NULL DEFAULT now());
GRANT SELECT ON public.brand_modes TO anon, authenticated; GRANT ALL ON public.brand_modes TO service_role;
ALTER TABLE public.brand_modes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read brand_modes" ON public.brand_modes FOR SELECT USING (true);
CREATE POLICY "Admins manage brand_modes" ON public.brand_modes FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

CREATE TABLE public.module_families (id text PRIMARY KEY, name text NOT NULL, description text, review_level text NOT NULL DEFAULT 'standard');
GRANT SELECT ON public.module_families TO anon, authenticated; GRANT ALL ON public.module_families TO service_role;
ALTER TABLE public.module_families ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read module_families" ON public.module_families FOR SELECT USING (true);
CREATE POLICY "Admins manage module_families" ON public.module_families FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

CREATE TABLE public.section_frameworks (id text PRIMARY KEY, name text NOT NULL, purpose text, permitted_family_ids text[] NOT NULL DEFAULT '{}');
GRANT SELECT ON public.section_frameworks TO anon, authenticated; GRANT ALL ON public.section_frameworks TO service_role;
ALTER TABLE public.section_frameworks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read section_frameworks" ON public.section_frameworks FOR SELECT USING (true);
CREATE POLICY "Admins manage section_frameworks" ON public.section_frameworks FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

CREATE TABLE public.layout_frameworks (id text PRIMARY KEY, name text NOT NULL, description text, zones text[] NOT NULL DEFAULT '{}');
GRANT SELECT ON public.layout_frameworks TO anon, authenticated; GRANT ALL ON public.layout_frameworks TO service_role;
ALTER TABLE public.layout_frameworks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read layout_frameworks" ON public.layout_frameworks FOR SELECT USING (true);
CREATE POLICY "Admins manage layout_frameworks" ON public.layout_frameworks FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

CREATE TABLE public.module_variants (id text PRIMARY KEY, family_id text NOT NULL REFERENCES public.module_families(id), name text NOT NULL, description text, permitted_layout_ids text[] NOT NULL DEFAULT '{}', capacity jsonb NOT NULL DEFAULT '{}'::jsonb, fallback_variant_id text, editable_fields text[] NOT NULL DEFAULT '{}', locked_fields text[] NOT NULL DEFAULT '{}');
GRANT SELECT ON public.module_variants TO anon, authenticated; GRANT ALL ON public.module_variants TO service_role;
ALTER TABLE public.module_variants ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read module_variants" ON public.module_variants FOR SELECT USING (true);
CREATE POLICY "Admins manage module_variants" ON public.module_variants FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

CREATE TABLE public.narrative_archetypes (id text PRIMARY KEY, name text NOT NULL, description text, section_recipe text[] NOT NULL DEFAULT '{}');
GRANT SELECT ON public.narrative_archetypes TO anon, authenticated; GRANT ALL ON public.narrative_archetypes TO service_role;
ALTER TABLE public.narrative_archetypes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read narrative_archetypes" ON public.narrative_archetypes FOR SELECT USING (true);
CREATE POLICY "Admins manage narrative_archetypes" ON public.narrative_archetypes FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

CREATE TABLE public.briefs (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), owner_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE, title text NOT NULL, prospect text, industry text, divisions text[] DEFAULT '{}', opportunity_type text, sales_stage text, meeting_objective text, audience text, brand_mode_id text REFERENCES public.brand_modes(id), length_target int, deadline date, known_facts text, risk_level text, inputs jsonb NOT NULL DEFAULT '{}'::jsonb, created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now());
GRANT SELECT, INSERT, UPDATE, DELETE ON public.briefs TO authenticated; GRANT ALL ON public.briefs TO service_role;
ALTER TABLE public.briefs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own briefs" ON public.briefs FOR ALL TO authenticated USING (auth.uid() = owner_id) WITH CHECK (auth.uid() = owner_id);
CREATE TRIGGER briefs_updated_at BEFORE UPDATE ON public.briefs FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.decks (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), owner_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE, brief_id uuid REFERENCES public.briefs(id) ON DELETE SET NULL, archetype_id text REFERENCES public.narrative_archetypes(id), brand_mode_id text REFERENCES public.brand_modes(id), title text NOT NULL, status text NOT NULL DEFAULT 'draft', created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now());
GRANT SELECT, INSERT, UPDATE, DELETE ON public.decks TO authenticated; GRANT ALL ON public.decks TO service_role;
ALTER TABLE public.decks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own decks" ON public.decks FOR ALL TO authenticated USING (auth.uid() = owner_id) WITH CHECK (auth.uid() = owner_id);
CREATE POLICY "Reviewers read all decks" ON public.decks FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'brand_reviewer'));
CREATE TRIGGER decks_updated_at BEFORE UPDATE ON public.decks FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.slide_modules (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), owner_id uuid REFERENCES auth.users(id) ON DELETE SET NULL, variant_id text NOT NULL REFERENCES public.module_variants(id), layout_id text NOT NULL REFERENCES public.layout_frameworks(id), brand_mode_id text REFERENCES public.brand_modes(id), title text, tags jsonb NOT NULL DEFAULT '{}'::jsonb, content jsonb NOT NULL DEFAULT '{}'::jsonb, approval_status text NOT NULL DEFAULT 'draft', approved_at timestamptz, expires_at timestamptz, source_deck uuid, thumbnail_url text, created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now());
GRANT SELECT, INSERT, UPDATE, DELETE ON public.slide_modules TO authenticated; GRANT ALL ON public.slide_modules TO service_role;
ALTER TABLE public.slide_modules ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Auth read modules" ON public.slide_modules FOR SELECT TO authenticated USING (approval_status = 'approved' OR auth.uid() = owner_id OR public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'brand_reviewer'));
CREATE POLICY "Users create modules" ON public.slide_modules FOR INSERT TO authenticated WITH CHECK (auth.uid() = owner_id);
CREATE POLICY "Users update own modules" ON public.slide_modules FOR UPDATE TO authenticated USING (auth.uid() = owner_id) WITH CHECK (auth.uid() = owner_id);
CREATE POLICY "Reviewers update modules" ON public.slide_modules FOR UPDATE TO authenticated USING (public.has_role(auth.uid(),'brand_reviewer') OR public.has_role(auth.uid(),'admin'));
CREATE TRIGGER slide_modules_updated_at BEFORE UPDATE ON public.slide_modules FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.deck_slides (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), deck_id uuid NOT NULL REFERENCES public.decks(id) ON DELETE CASCADE, position int NOT NULL, section_id text REFERENCES public.section_frameworks(id), variant_id text NOT NULL REFERENCES public.module_variants(id), layout_id text NOT NULL REFERENCES public.layout_frameworks(id), source_module_id uuid REFERENCES public.slide_modules(id), content jsonb NOT NULL DEFAULT '{}'::jsonb, ai_change_log jsonb NOT NULL DEFAULT '[]'::jsonb, created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(), UNIQUE (deck_id, position));
GRANT SELECT, INSERT, UPDATE, DELETE ON public.deck_slides TO authenticated; GRANT ALL ON public.deck_slides TO service_role;
ALTER TABLE public.deck_slides ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage slides of own decks" ON public.deck_slides FOR ALL TO authenticated USING (EXISTS (SELECT 1 FROM public.decks d WHERE d.id = deck_slides.deck_id AND d.owner_id = auth.uid())) WITH CHECK (EXISTS (SELECT 1 FROM public.decks d WHERE d.id = deck_slides.deck_id AND d.owner_id = auth.uid()));
CREATE POLICY "Reviewers read deck_slides" ON public.deck_slides FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'brand_reviewer'));
CREATE TRIGGER deck_slides_updated_at BEFORE UPDATE ON public.deck_slides FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();