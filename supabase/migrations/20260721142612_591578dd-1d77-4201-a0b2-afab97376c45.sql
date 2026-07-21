
-- 1) Singleton settings row (admin-managed), same pattern as globallink_config.
CREATE TABLE public.globallink_share_settings (
  id boolean NOT NULL PRIMARY KEY DEFAULT true CHECK (id = true),
  default_link_expiry_days integer NOT NULL DEFAULT 30 CHECK (default_link_expiry_days BETWEEN 1 AND 3650),
  password_protect boolean NOT NULL DEFAULT false,
  notify_recipients boolean NOT NULL DEFAULT true,
  default_folder text,
  auto_share_on_export boolean NOT NULL DEFAULT false,
  updated_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.globallink_share_settings TO authenticated;
GRANT ALL ON public.globallink_share_settings TO service_role;

ALTER TABLE public.globallink_share_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view GlobalLink Share settings"
  ON public.globallink_share_settings FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can insert GlobalLink Share settings"
  ON public.globallink_share_settings FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can update GlobalLink Share settings"
  ON public.globallink_share_settings FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER trg_globallink_share_settings_updated_at
  BEFORE UPDATE ON public.globallink_share_settings
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Seed the singleton so getSettings never returns nothing.
INSERT INTO public.globallink_share_settings (id) VALUES (true)
  ON CONFLICT (id) DO NOTHING;

-- 2) Per-user activity log for Share uploads.
CREATE TABLE public.globallink_share_activity (
  id uuid NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  deck_id uuid,
  deck_title text,
  file_name text NOT NULL,
  share_url text,
  file_size_bytes bigint,
  status text NOT NULL CHECK (status IN ('success','failed')),
  error_message text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX globallink_share_activity_user_created_idx
  ON public.globallink_share_activity (user_id, created_at DESC);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.globallink_share_activity TO authenticated;
GRANT ALL ON public.globallink_share_activity TO service_role;

ALTER TABLE public.globallink_share_activity ENABLE ROW LEVEL SECURITY;

-- Users see and manage their own activity. Admins also see everything.
CREATE POLICY "Users read own share activity"
  ON public.globallink_share_activity FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Users insert own share activity"
  ON public.globallink_share_activity FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users delete own share activity"
  ON public.globallink_share_activity FOR DELETE TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'::app_role));
