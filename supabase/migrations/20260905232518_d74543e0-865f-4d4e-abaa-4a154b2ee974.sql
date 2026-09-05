ALTER TABLE public.london_signage_revisions
  ADD COLUMN IF NOT EXISTS removed_ids jsonb NOT NULL DEFAULT '[]'::jsonb;

CREATE OR REPLACE FUNCTION public.get_london_head_revision()
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT jsonb_build_object(
    'id', r.id,
    'rev', r.rev,
    'note', r.note,
    'panels', COALESCE(r.panels, '[]'::jsonb),
    'changes', COALESCE(r.changes, '[]'::jsonb),
    'regen', COALESCE(r.regen, '{}'::jsonb),
    'removed_ids', COALESCE(r.removed_ids, '[]'::jsonb),
    'restored_from', r.restored_from,
    'created_at', r.created_at
  )
  FROM public.london_signage_revisions r
  ORDER BY r.rev DESC
  LIMIT 1
$$;

GRANT EXECUTE ON FUNCTION public.get_london_head_revision() TO anon, authenticated;