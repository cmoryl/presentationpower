CREATE TABLE public.london_live_files (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  panel_id TEXT NOT NULL,
  version INTEGER NOT NULL,
  master_path TEXT NOT NULL,
  master_filename TEXT NOT NULL,
  master_content_type TEXT,
  proof_path TEXT,
  trim_w NUMERIC,
  trim_h NUMERIC,
  note TEXT,
  issued DATE NOT NULL DEFAULT CURRENT_DATE,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_by UUID REFERENCES auth.users,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (panel_id, version)
);

CREATE INDEX london_live_files_panel_idx ON public.london_live_files (panel_id, version DESC);

GRANT SELECT ON public.london_live_files TO anon;
GRANT SELECT, INSERT, UPDATE ON public.london_live_files TO authenticated;
GRANT ALL ON public.london_live_files TO service_role;

ALTER TABLE public.london_live_files ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Active London live files are readable"
  ON public.london_live_files FOR SELECT
  TO anon, authenticated
  USING (is_active = true);

CREATE POLICY "Brand team can add London live files"
  ON public.london_live_files FOR INSERT
  TO authenticated
  WITH CHECK (
    public.has_role(auth.uid(), 'admin')
    OR public.has_role(auth.uid(), 'brand_lead')
    OR public.has_role(auth.uid(), 'brand_reviewer')
  );

CREATE POLICY "Brand team can retire London live files"
  ON public.london_live_files FOR UPDATE
  TO authenticated
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

CREATE POLICY "Brand team can upload London live files"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'london-live-files'
    AND (
      public.has_role(auth.uid(), 'admin')
      OR public.has_role(auth.uid(), 'brand_lead')
      OR public.has_role(auth.uid(), 'brand_reviewer')
    )
  );

CREATE POLICY "Brand team can replace London live files"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'london-live-files'
    AND (
      public.has_role(auth.uid(), 'admin')
      OR public.has_role(auth.uid(), 'brand_lead')
      OR public.has_role(auth.uid(), 'brand_reviewer')
    )
  );

CREATE POLICY "Brand team can read London live files"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'london-live-files'
    AND (
      public.has_role(auth.uid(), 'admin')
      OR public.has_role(auth.uid(), 'brand_lead')
      OR public.has_role(auth.uid(), 'brand_reviewer')
    )
  );