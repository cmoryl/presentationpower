CREATE TABLE public.next_division_editors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  division_id text NOT NULL,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE (division_id, user_id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.next_division_editors TO authenticated;
GRANT ALL ON public.next_division_editors TO service_role;

ALTER TABLE public.next_division_editors ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own editor rows"
  ON public.next_division_editors
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins and brand reviewers can view all division editors"
  ON public.next_division_editors
  FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'brand_reviewer'));

CREATE POLICY "Admins and brand reviewers can manage all division editors"
  ON public.next_division_editors
  FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'brand_reviewer'))
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'brand_reviewer'));

ALTER TABLE public.event_pillar_versions ADD COLUMN IF NOT EXISTS division_id text;

CREATE INDEX IF NOT EXISTS idx_next_division_editors_user_division
  ON public.next_division_editors(user_id, division_id);

CREATE INDEX IF NOT EXISTS idx_event_pillar_versions_division
  ON public.event_pillar_versions(division_id);