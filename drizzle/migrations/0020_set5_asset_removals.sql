CREATE TABLE public.sjb_set5_asset_removals (
  asset_id text PRIMARY KEY,
  removed_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.sjb_set5_asset_removals TO anon;
GRANT SELECT, INSERT, DELETE ON public.sjb_set5_asset_removals TO authenticated;
GRANT ALL ON public.sjb_set5_asset_removals TO service_role;
ALTER TABLE public.sjb_set5_asset_removals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Read Set 5 removals" ON public.sjb_set5_asset_removals FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Admins remove Set 5 assets" ON public.sjb_set5_asset_removals FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins restore Set 5 assets" ON public.sjb_set5_asset_removals FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));