CREATE TABLE public.london_signage_revisions (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  rev integer NOT NULL,
  note text,
  author_id uuid,
  panels jsonb NOT NULL,
  changes jsonb NOT NULL DEFAULT '[]'::jsonb,
  regen jsonb NOT NULL DEFAULT '{}'::jsonb,
  restored_from integer,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE (rev)
);

CREATE INDEX london_signage_revisions_rev_idx ON public.london_signage_revisions (rev DESC);

GRANT SELECT ON public.london_signage_revisions TO authenticated;
GRANT ALL ON public.london_signage_revisions TO service_role;

ALTER TABLE public.london_signage_revisions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Signed-in users can read signage revisions"
ON public.london_signage_revisions FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins and brand leads can publish signage revisions"
ON public.london_signage_revisions FOR INSERT TO authenticated
WITH CHECK (
  author_id = auth.uid()
  AND (
    public.has_role(auth.uid(), 'admin')
    OR public.has_role(auth.uid(), 'brand_lead')
    OR public.has_role(auth.uid(), 'brand_reviewer')
  )
);