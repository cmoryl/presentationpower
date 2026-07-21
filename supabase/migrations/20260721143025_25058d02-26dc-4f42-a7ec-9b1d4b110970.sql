
ALTER TABLE public.globallink_share_activity
  ALTER COLUMN deck_id TYPE text USING deck_id::text;
