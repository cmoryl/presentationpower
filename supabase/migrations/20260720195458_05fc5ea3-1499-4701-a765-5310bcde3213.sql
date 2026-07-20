
-- =========================================================================
-- LANGUAGES
-- =========================================================================
CREATE TABLE public.languages (
  id text PRIMARY KEY,          -- BCP-47-ish: es, fr, pt-BR, zh-CN
  label text NOT NULL,          -- English label: "Spanish"
  native text NOT NULL,         -- Native label: "Español"
  rtl boolean NOT NULL DEFAULT false,
  active boolean NOT NULL DEFAULT true,
  sort_order int NOT NULL DEFAULT 100,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.languages TO authenticated;
GRANT ALL ON public.languages TO service_role;

ALTER TABLE public.languages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Languages readable by authenticated"
  ON public.languages FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins manage languages"
  ON public.languages FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER languages_set_updated_at
  BEFORE UPDATE ON public.languages
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- =========================================================================
-- DECK TRANSLATIONS
-- =========================================================================
CREATE TABLE public.deck_translations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_deck_id uuid NOT NULL REFERENCES public.decks(id) ON DELETE CASCADE,
  target_lang text NOT NULL REFERENCES public.languages(id),
  mode text NOT NULL DEFAULT 'copy',    -- 'in_place' | 'copy' | 'batch'
  status text NOT NULL DEFAULT 'draft', -- draft | translating | ready | failed
  engine text NOT NULL DEFAULT 'globallink',
  job_ref text,
  translated_deck_id uuid REFERENCES public.decks(id) ON DELETE SET NULL,
  human_review boolean NOT NULL DEFAULT false,
  progress_current int NOT NULL DEFAULT 0,
  progress_total int NOT NULL DEFAULT 0,
  error text,
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX deck_translations_source_idx ON public.deck_translations(source_deck_id);
CREATE INDEX deck_translations_translated_idx ON public.deck_translations(translated_deck_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.deck_translations TO authenticated;
GRANT ALL ON public.deck_translations TO service_role;

ALTER TABLE public.deck_translations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners read own deck translations"
  ON public.deck_translations FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.decks d WHERE d.id = source_deck_id AND d.owner_id = auth.uid()));

CREATE POLICY "Owners insert own deck translations"
  ON public.deck_translations FOR INSERT TO authenticated
  WITH CHECK (created_by = auth.uid()
    AND EXISTS (SELECT 1 FROM public.decks d WHERE d.id = source_deck_id AND d.owner_id = auth.uid()));

CREATE POLICY "Owners update own deck translations"
  ON public.deck_translations FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.decks d WHERE d.id = source_deck_id AND d.owner_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.decks d WHERE d.id = source_deck_id AND d.owner_id = auth.uid()));

CREATE POLICY "Owners delete own deck translations"
  ON public.deck_translations FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.decks d WHERE d.id = source_deck_id AND d.owner_id = auth.uid()));

CREATE TRIGGER deck_translations_set_updated_at
  BEFORE UPDATE ON public.deck_translations
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- =========================================================================
-- SLIDE TRANSLATIONS
-- =========================================================================
CREATE TABLE public.slide_translations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slide_id uuid NOT NULL REFERENCES public.deck_slides(id) ON DELETE CASCADE,
  target_lang text NOT NULL REFERENCES public.languages(id),
  source_hash text,
  translated_content jsonb NOT NULL DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'ready', -- ready | translating | failed
  engine text NOT NULL DEFAULT 'globallink',
  job_ref text,
  error text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (slide_id, target_lang)
);

CREATE INDEX slide_translations_slide_idx ON public.slide_translations(slide_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.slide_translations TO authenticated;
GRANT ALL ON public.slide_translations TO service_role;

ALTER TABLE public.slide_translations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners read own slide translations"
  ON public.slide_translations FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.deck_slides s
    JOIN public.decks d ON d.id = s.deck_id
    WHERE s.id = slide_id AND d.owner_id = auth.uid()
  ));

CREATE POLICY "Owners write own slide translations"
  ON public.slide_translations FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.deck_slides s
    JOIN public.decks d ON d.id = s.deck_id
    WHERE s.id = slide_id AND d.owner_id = auth.uid()
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.deck_slides s
    JOIN public.decks d ON d.id = s.deck_id
    WHERE s.id = slide_id AND d.owner_id = auth.uid()
  ));

CREATE TRIGGER slide_translations_set_updated_at
  BEFORE UPDATE ON public.slide_translations
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- =========================================================================
-- GLOSSARY TERMS
-- =========================================================================
CREATE TABLE public.glossary_terms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  term text NOT NULL,
  do_not_translate boolean NOT NULL DEFAULT true,
  translations jsonb NOT NULL DEFAULT '{}'::jsonb, -- { "es": "override", ... }
  scope text NOT NULL DEFAULT 'global',            -- global | division | deck
  scope_id text,                                    -- division id or deck uuid as text
  notes text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (scope, scope_id, term)
);

CREATE INDEX glossary_terms_scope_idx ON public.glossary_terms(scope, scope_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.glossary_terms TO authenticated;
GRANT ALL ON public.glossary_terms TO service_role;

ALTER TABLE public.glossary_terms ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Glossary readable by authenticated"
  ON public.glossary_terms FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins manage global + division glossary"
  ON public.glossary_terms FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin') AND scope IN ('global','division'))
  WITH CHECK (public.has_role(auth.uid(), 'admin') AND scope IN ('global','division'));

CREATE POLICY "Deck owners manage own deck glossary"
  ON public.glossary_terms FOR ALL TO authenticated
  USING (scope = 'deck' AND scope_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.decks d WHERE d.id::text = scope_id AND d.owner_id = auth.uid()
  ))
  WITH CHECK (scope = 'deck' AND scope_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.decks d WHERE d.id::text = scope_id AND d.owner_id = auth.uid()
  ));

CREATE TRIGGER glossary_terms_set_updated_at
  BEFORE UPDATE ON public.glossary_terms
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- =========================================================================
-- SEED LANGUAGES
-- =========================================================================
INSERT INTO public.languages (id, label, native, rtl, sort_order) VALUES
  ('es',    'Spanish',              'Español',      false, 10),
  ('fr',    'French',               'Français',     false, 11),
  ('de',    'German',               'Deutsch',      false, 12),
  ('it',    'Italian',              'Italiano',     false, 13),
  ('pt-BR', 'Portuguese (Brazil)',  'Português (BR)', false, 14),
  ('pt-PT', 'Portuguese (Portugal)','Português (PT)', false, 15),
  ('nl',    'Dutch',                'Nederlands',   false, 16),
  ('pl',    'Polish',               'Polski',       false, 17),
  ('cs',    'Czech',                'Čeština',      false, 18),
  ('sv',    'Swedish',              'Svenska',      false, 19),
  ('da',    'Danish',               'Dansk',        false, 20),
  ('fi',    'Finnish',              'Suomi',        false, 21),
  ('no',    'Norwegian',            'Norsk',        false, 22),
  ('tr',    'Turkish',              'Türkçe',       false, 23),
  ('ru',    'Russian',              'Русский',      false, 24),
  ('uk',    'Ukrainian',            'Українська',   false, 25),
  ('ar',    'Arabic',               'العربية',       true,  30),
  ('he',    'Hebrew',               'עברית',         true,  31),
  ('fa',    'Persian',              'فارسی',         true,  32),
  ('ur',    'Urdu',                 'اردو',          true,  33),
  ('ja',    'Japanese',             '日本語',        false, 40),
  ('ko',    'Korean',               '한국어',        false, 41),
  ('zh-CN', 'Chinese (Simplified)', '简体中文',      false, 42),
  ('zh-TW', 'Chinese (Traditional)','繁體中文',      false, 43),
  ('th',    'Thai',                 'ไทย',           false, 44),
  ('vi',    'Vietnamese',           'Tiếng Việt',    false, 45),
  ('id',    'Indonesian',           'Bahasa Indonesia', false, 46),
  ('ms',    'Malay',                'Bahasa Melayu', false, 47),
  ('hi',    'Hindi',                'हिन्दी',         false, 50),
  ('bn',    'Bengali',              'বাংলা',         false, 51),
  ('ta',    'Tamil',                'தமிழ்',         false, 52),
  ('el',    'Greek',                'Ελληνικά',      false, 60),
  ('ro',    'Romanian',             'Română',        false, 61),
  ('hu',    'Hungarian',            'Magyar',        false, 62),
  ('bg',    'Bulgarian',            'Български',     false, 63),
  ('sk',    'Slovak',               'Slovenčina',    false, 64),
  ('sl',    'Slovenian',            'Slovenščina',   false, 65),
  ('hr',    'Croatian',             'Hrvatski',      false, 66),
  ('sr',    'Serbian',              'Srpski',        false, 67),
  ('et',    'Estonian',             'Eesti',         false, 68),
  ('lv',    'Latvian',              'Latviešu',      false, 69),
  ('lt',    'Lithuanian',           'Lietuvių',      false, 70)
ON CONFLICT (id) DO NOTHING;

-- =========================================================================
-- SEED GLOBAL GLOSSARY (brand + division + product names)
-- =========================================================================
INSERT INTO public.glossary_terms (term, do_not_translate, scope, notes) VALUES
  ('TransPerfect', true, 'global', 'Parent brand — never translate'),
  ('GlobalLink', true, 'global', 'Platform — never translate'),
  ('DataForce', true, 'global', 'Division brand'),
  ('WorldServer', true, 'global', 'Product'),
  ('Wordfast', true, 'global', 'Product'),
  ('MediaNext', true, 'global', 'Division brand'),
  ('LegalTech', true, 'global', 'Division brand'),
  ('Translations.com', true, 'global', 'Consumer-facing brand'),
  ('Ai Studio', true, 'global', 'Product'),
  ('OneLink', true, 'global', 'Product'),
  ('Stream Studio', true, 'global', 'Product'),
  ('TransPerfect Life Sciences', true, 'global', 'Division'),
  ('TransPerfect Legal', true, 'global', 'Division'),
  ('TransPerfect Gaming', true, 'global', 'Division'),
  ('TransPerfect Media', true, 'global', 'Division'),
  ('TransPerfect Retail', true, 'global', 'Division'),
  ('TransPerfect Financial', true, 'global', 'Division'),
  ('TransPerfect Technology', true, 'global', 'Division'),
  ('TransPerfect Travel', true, 'global', 'Division'),
  ('TransPerfect Manufacturing', true, 'global', 'Division'),
  ('TransPerfect Connect', true, 'global', 'Division')
ON CONFLICT (scope, scope_id, term) DO NOTHING;
