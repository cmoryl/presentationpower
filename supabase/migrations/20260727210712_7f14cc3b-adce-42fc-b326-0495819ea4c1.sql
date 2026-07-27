ALTER TABLE public.campaign_kits
  ADD COLUMN IF NOT EXISTS next_design boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS next_track_id text NOT NULL DEFAULT 'city-series';