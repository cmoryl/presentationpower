
-- imported_decks: user-uploaded .pptx files associated with a division for later Layer 2 processing.
CREATE TABLE public.imported_decks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  division_id text NOT NULL,
  uploaded_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  original_filename text NOT NULL,
  storage_path text NOT NULL,
  file_size bigint NOT NULL DEFAULT 0,
  slide_count integer NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'uploaded',
  error text,
  theme jsonb,
  slides jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.imported_decks TO authenticated;
GRANT ALL ON public.imported_decks TO service_role;

ALTER TABLE public.imported_decks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owner or admin can read imported decks"
  ON public.imported_decks FOR SELECT TO authenticated
  USING (auth.uid() = uploaded_by OR public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Authenticated users insert their own imported decks"
  ON public.imported_decks FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = uploaded_by);

CREATE POLICY "Owner or admin updates imported decks"
  ON public.imported_decks FOR UPDATE TO authenticated
  USING (auth.uid() = uploaded_by OR public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (auth.uid() = uploaded_by OR public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Owner or admin deletes imported decks"
  ON public.imported_decks FOR DELETE TO authenticated
  USING (auth.uid() = uploaded_by OR public.has_role(auth.uid(), 'admin'::app_role));

CREATE INDEX imported_decks_division_idx ON public.imported_decks (division_id, created_at DESC);
CREATE INDEX imported_decks_uploader_idx ON public.imported_decks (uploaded_by, created_at DESC);

CREATE TRIGGER imported_decks_set_updated_at
  BEFORE UPDATE ON public.imported_decks
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Storage RLS for division-pptx: authenticated users manage files under {uid}/... path.
CREATE POLICY "Users read own division-pptx"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'division-pptx' AND (auth.uid()::text = (storage.foldername(name))[1] OR public.has_role(auth.uid(), 'admin'::app_role)));

CREATE POLICY "Users upload own division-pptx"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'division-pptx' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users delete own division-pptx"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'division-pptx' AND (auth.uid()::text = (storage.foldername(name))[1] OR public.has_role(auth.uid(), 'admin'::app_role)));
