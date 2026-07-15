-- Knowledge base for divisions with cross-division sharing.

CREATE TYPE public.knowledge_kind AS ENUM ('fact', 'proof_point', 'case_study', 'policy', 'terminology', 'note');
CREATE TYPE public.knowledge_visibility AS ENUM ('private', 'shared', 'global');

CREATE TABLE public.knowledge_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_division_id text NOT NULL,
  title text NOT NULL,
  body text NOT NULL DEFAULT '',
  kind public.knowledge_kind NOT NULL DEFAULT 'fact',
  tags text[] NOT NULL DEFAULT ARRAY[]::text[],
  sources text[] NOT NULL DEFAULT ARRAY[]::text[],
  visibility public.knowledge_visibility NOT NULL DEFAULT 'private',
  shared_with_division_ids text[] NOT NULL DEFAULT ARRAY[]::text[],
  expires_at timestamptz,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX knowledge_entries_owner_idx ON public.knowledge_entries (owner_division_id);
CREATE INDEX knowledge_entries_kind_idx ON public.knowledge_entries (kind);
CREATE INDEX knowledge_entries_visibility_idx ON public.knowledge_entries (visibility);
CREATE INDEX knowledge_entries_tags_idx ON public.knowledge_entries USING GIN (tags);
CREATE INDEX knowledge_entries_shared_with_idx ON public.knowledge_entries USING GIN (shared_with_division_ids);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.knowledge_entries TO authenticated;
GRANT ALL ON public.knowledge_entries TO service_role;

ALTER TABLE public.knowledge_entries ENABLE ROW LEVEL SECURITY;

-- Authenticated users can read all entries. UI filters by division; discovery
-- is the whole point of the shared knowledge layer.
CREATE POLICY "Authenticated can read knowledge entries"
  ON public.knowledge_entries
  FOR SELECT
  TO authenticated
  USING (true);

-- Any signed-in user can create entries.
CREATE POLICY "Authenticated can create knowledge entries"
  ON public.knowledge_entries
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = created_by);

-- Creators, admins, or brand reviewers can update.
CREATE POLICY "Owners and reviewers can update knowledge entries"
  ON public.knowledge_entries
  FOR UPDATE
  TO authenticated
  USING (
    auth.uid() = created_by
    OR public.has_role(auth.uid(), 'admin')
    OR public.has_role(auth.uid(), 'brand_reviewer')
  )
  WITH CHECK (
    auth.uid() = created_by
    OR public.has_role(auth.uid(), 'admin')
    OR public.has_role(auth.uid(), 'brand_reviewer')
  );

-- Creators, admins, or brand reviewers can delete.
CREATE POLICY "Owners and reviewers can delete knowledge entries"
  ON public.knowledge_entries
  FOR DELETE
  TO authenticated
  USING (
    auth.uid() = created_by
    OR public.has_role(auth.uid(), 'admin')
    OR public.has_role(auth.uid(), 'brand_reviewer')
  );

CREATE TRIGGER knowledge_entries_updated_at
  BEFORE UPDATE ON public.knowledge_entries
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();