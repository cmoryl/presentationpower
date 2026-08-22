CREATE TABLE public.social_asset_edits (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  edit_key TEXT NOT NULL,
  patch JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (user_id, edit_key)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.social_asset_edits TO authenticated;
GRANT ALL ON public.social_asset_edits TO service_role;

ALTER TABLE public.social_asset_edits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage their own social asset edits"
  ON public.social_asset_edits FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER social_asset_edits_updated_at
  BEFORE UPDATE ON public.social_asset_edits
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();