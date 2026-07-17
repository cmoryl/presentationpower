
-- LogoHub table
CREATE TABLE public.client_logos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_name text NOT NULL,
  slug text NOT NULL UNIQUE,
  industry text,
  division_id text,
  notes text,
  primary_path text NOT NULL,
  dark_path text,
  light_path text,
  mono_path text,
  source_filename text,
  mime_type text,
  file_size bigint,
  source text,
  website text,
  tags text[] NOT NULL DEFAULT ARRAY[]::text[],
  is_active boolean NOT NULL DEFAULT true,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.client_logos TO authenticated;
GRANT ALL ON public.client_logos TO service_role;

ALTER TABLE public.client_logos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can read client logos"
  ON public.client_logos FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated can add client logos"
  ON public.client_logos FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Owner or admin can update client logos"
  ON public.client_logos FOR UPDATE
  TO authenticated
  USING (auth.uid() = created_by OR has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'brand_reviewer'::app_role))
  WITH CHECK (auth.uid() = created_by OR has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'brand_reviewer'::app_role));

CREATE POLICY "Owner or admin can delete client logos"
  ON public.client_logos FOR DELETE
  TO authenticated
  USING (auth.uid() = created_by OR has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'brand_reviewer'::app_role));

CREATE TRIGGER client_logos_updated_at
  BEFORE UPDATE ON public.client_logos
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX client_logos_slug_idx ON public.client_logos (slug);
CREATE INDEX client_logos_industry_idx ON public.client_logos (industry);
CREATE INDEX client_logos_division_idx ON public.client_logos (division_id);
CREATE INDEX client_logos_tags_idx ON public.client_logos USING gin (tags);

-- Storage policies for the client-logos bucket
CREATE POLICY "Authenticated can read client-logos"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (bucket_id = 'client-logos');

CREATE POLICY "Authenticated can upload client-logos"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'client-logos');

CREATE POLICY "Owner or admin can update client-logos"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'client-logos'
    AND (owner = auth.uid() OR has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'brand_reviewer'::app_role))
  );

CREATE POLICY "Owner or admin can delete client-logos"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'client-logos'
    AND (owner = auth.uid() OR has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'brand_reviewer'::app_role))
  );
