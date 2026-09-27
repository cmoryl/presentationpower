-- Signage revisions: the database now enforces what the publish screen already
-- checks, so a direct write cannot become the "revision in force" with a
-- skipped number or an empty panel set.
create or replace function public.guard_london_signage_revision()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  head_rev integer;
begin
  select coalesce(max(rev), 0) into head_rev from public.london_signage_revisions;
  if new.rev <> head_rev + 1 then
    raise exception 'Revision number must be % (next after the revision in force), got %', head_rev + 1, new.rev;
  end if;
  if new.panels is null or jsonb_typeof(new.panels) <> 'array' or jsonb_array_length(new.panels) = 0 then
    raise exception 'A revision must contain the full panel set';
  end if;
  return new;
end;
$$;

drop trigger if exists guard_london_signage_revision on public.london_signage_revisions;
create trigger guard_london_signage_revision
before insert on public.london_signage_revisions
for each row execute function public.guard_london_signage_revision();

-- Brand reviewers must be able to open print pieces sent to them for approval.
create policy "Brand reviewers can view print assets"
on public.print_assets
for select
to authenticated
using (public.has_role(auth.uid(), 'brand_reviewer'::app_role));