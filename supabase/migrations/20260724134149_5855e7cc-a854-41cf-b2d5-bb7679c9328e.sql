ALTER TABLE public.usage_events ALTER COLUMN deck_id TYPE text USING deck_id::text;
ALTER TABLE public.usage_events ALTER COLUMN slide_id TYPE text USING slide_id::text;