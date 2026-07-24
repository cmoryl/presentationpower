
CREATE TABLE public.campaign_kits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  surface text NOT NULL CHECK (surface IN ('social','event')),
  brand_id text NOT NULL DEFAULT 'bm-tp-master',
  mode text NOT NULL DEFAULT 'dark' CHECK (mode IN ('light','dark','both')),
  profile_id text NOT NULL DEFAULT 'social-essentials',
  format_ids text[] NOT NULL DEFAULT '{}',
  copy jsonb NOT NULL DEFAULT '{}'::jsonb,
  event_facts jsonb NOT NULL DEFAULT '{}'::jsonb,
  attach_event boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX campaign_kits_user_updated_idx ON public.campaign_kits (user_id, updated_at DESC);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.campaign_kits TO authenticated;
GRANT ALL ON public.campaign_kits TO service_role;

ALTER TABLE public.campaign_kits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own campaign kits"
  ON public.campaign_kits FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER campaign_kits_set_updated_at
  BEFORE UPDATE ON public.campaign_kits
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
