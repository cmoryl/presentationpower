ALTER TABLE public.learning_signals ADD COLUMN IF NOT EXISTS event_id text, ADD COLUMN IF NOT EXISTS city text;
ALTER TABLE public.learning_suggestions ADD COLUMN IF NOT EXISTS event_id text, ADD COLUMN IF NOT EXISTS city text, ADD COLUMN IF NOT EXISTS event_knowledge_id uuid;
ALTER TABLE public.event_venue_knowledge DROP CONSTRAINT IF EXISTS event_venue_knowledge_source_check;
ALTER TABLE public.event_venue_knowledge ADD CONSTRAINT event_venue_knowledge_source_check CHECK (source IN ('harvest','publish','lesson-log','decision-log','manual','learned'));
CREATE INDEX IF NOT EXISTS learning_signals_pending_idx ON public.learning_signals (created_at) WHERE distilled_at IS NULL;