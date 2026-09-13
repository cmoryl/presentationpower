ALTER TABLE public.event_venue_knowledge DROP CONSTRAINT IF EXISTS event_venue_knowledge_kind_check;
ALTER TABLE public.event_venue_knowledge ADD CONSTRAINT event_venue_knowledge_kind_check
  CHECK (kind IN ('spec','placement','ground','substrate','lesson','decision','outcome'));
ALTER TABLE public.event_venue_knowledge DROP CONSTRAINT IF EXISTS event_venue_knowledge_source_check;
ALTER TABLE public.event_venue_knowledge ADD CONSTRAINT event_venue_knowledge_source_check
  CHECK (source IN ('harvest','publish','lesson-log','decision-log','manual'));