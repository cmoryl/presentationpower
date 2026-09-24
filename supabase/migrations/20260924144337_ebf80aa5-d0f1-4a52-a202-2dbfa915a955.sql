ALTER TABLE public.event_pillar_versions ADD COLUMN IF NOT EXISTS edition_id text;
ALTER TABLE public.next_agenda_versions ADD COLUMN IF NOT EXISTS edition_id text;
CREATE INDEX IF NOT EXISTS event_pillar_versions_edition_idx ON public.event_pillar_versions (edition_id, division_id);
CREATE INDEX IF NOT EXISTS next_agenda_versions_edition_idx ON public.next_agenda_versions (edition_id, division_id);