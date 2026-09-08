CREATE TABLE public.kit_qr_downloads (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  kit_id TEXT NOT NULL,
  kit_label TEXT,
  format TEXT NOT NULL CHECK (format IN ('svg','png')),
  user_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX kit_qr_downloads_kit_idx ON public.kit_qr_downloads (kit_id, created_at DESC);
GRANT INSERT ON public.kit_qr_downloads TO anon;
GRANT SELECT, INSERT ON public.kit_qr_downloads TO authenticated;
GRANT ALL ON public.kit_qr_downloads TO service_role;
ALTER TABLE public.kit_qr_downloads ENABLE ROW LEVEL SECURITY;
CREATE POLICY "kit_qr_downloads_insert_anon" ON public.kit_qr_downloads FOR INSERT TO anon WITH CHECK (user_id IS NULL);
CREATE POLICY "kit_qr_downloads_insert_auth" ON public.kit_qr_downloads FOR INSERT TO authenticated WITH CHECK (user_id IS NULL OR user_id = auth.uid());
CREATE POLICY "kit_qr_downloads_select_admin" ON public.kit_qr_downloads FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));