CREATE TABLE public.skin_backdrops (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  skin_code text NOT NULL,
  scene text NOT NULL DEFAULT 'field',
  take integer NOT NULL DEFAULT 0,
  prompt text NOT NULL,
  storage_path text NOT NULL,
  image_url text NOT NULL,
  created_by uuid REFERENCES auth.users,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (skin_code, scene, take)
);

GRANT SELECT ON public.skin_backdrops TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.skin_backdrops TO authenticated;
GRANT ALL ON public.skin_backdrops TO service_role;

ALTER TABLE public.skin_backdrops ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Skin backdrops are readable by everyone"
  ON public.skin_backdrops FOR SELECT USING (true);

CREATE POLICY "Signed-in users can add skin backdrops"
  ON public.skin_backdrops FOR INSERT TO authenticated WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Signed-in users can update skin backdrops"
  ON public.skin_backdrops FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Signed-in users can remove skin backdrops"
  ON public.skin_backdrops FOR DELETE TO authenticated USING (true);

CREATE POLICY "Signed-in users can upload skin backdrop images"
  ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'skin-backdrops');

CREATE POLICY "Signed-in users can read skin backdrop images"
  ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'skin-backdrops');
