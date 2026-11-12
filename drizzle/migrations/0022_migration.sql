CREATE TABLE public.canva_asset_sync (
  design_id text PRIMARY KEY,
  canva_updated_at timestamptz,
  synced_at timestamptz,
  storage_path text,
  bytes integer,
  last_error text,
  checked_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.canva_asset_sync TO anon, authenticated;
GRANT ALL ON public.canva_asset_sync TO service_role;
ALTER TABLE public.canva_asset_sync ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Synced Canva pictures are public artwork" ON public.canva_asset_sync
  FOR SELECT TO anon, authenticated USING (synced_at IS NOT NULL);