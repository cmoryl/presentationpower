
CREATE TABLE public.division_imagery (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  division_id TEXT NOT NULL,
  storage_path TEXT NOT NULL UNIQUE,
  filename TEXT NOT NULL,
  content_type TEXT,
  size_bytes BIGINT NOT NULL DEFAULT 0,
  kind TEXT NOT NULL DEFAULT 'upload' CHECK (kind IN ('photo','abstract','generated','upload')),
  tags TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  note TEXT,
  prompt TEXT,
  uploaded_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX division_imagery_division_idx ON public.division_imagery (division_id, created_at DESC);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.division_imagery TO authenticated;
GRANT ALL ON public.division_imagery TO service_role;

ALTER TABLE public.division_imagery ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Signed-in users can read division imagery"
  ON public.division_imagery FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Signed-in users can upload division imagery"
  ON public.division_imagery FOR INSERT
  TO authenticated
  WITH CHECK (uploaded_by = auth.uid());

CREATE POLICY "Owner or admin can update division imagery"
  ON public.division_imagery FOR UPDATE
  TO authenticated
  USING (uploaded_by = auth.uid() OR public.has_role(auth.uid(), 'admin'))
  WITH CHECK (uploaded_by = auth.uid() OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Owner or admin can delete division imagery"
  ON public.division_imagery FOR DELETE
  TO authenticated
  USING (uploaded_by = auth.uid() OR public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER division_imagery_updated_at
  BEFORE UPDATE ON public.division_imagery
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Storage policies for the private `division-imagery` bucket.
CREATE POLICY "Signed-in users can read division imagery objects"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (bucket_id = 'division-imagery');

CREATE POLICY "Signed-in users can upload to division imagery bucket"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'division-imagery'
    AND (auth.uid())::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Owner or admin can update division imagery objects"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'division-imagery'
    AND (
      (auth.uid())::text = (storage.foldername(name))[1]
      OR public.has_role(auth.uid(), 'admin')
    )
  );

CREATE POLICY "Owner or admin can delete division imagery objects"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'division-imagery'
    AND (
      (auth.uid())::text = (storage.foldername(name))[1]
      OR public.has_role(auth.uid(), 'admin')
    )
  );
