-- Replace the blanket "any signed-in user can read every profile" policy with
-- an admin-only listing policy plus a narrow name-lookup function.
drop policy if exists "Authenticated can read profile display names" on public.profiles;

create policy "Admins can read all profiles"
on public.profiles
for select
to authenticated
using (public.has_role(auth.uid(), 'admin'::app_role));

create or replace function public.display_names(_ids uuid[])
returns table(id uuid, display_name text)
language sql
stable
security definer
set search_path = public
as $$
  select p.id, p.display_name
  from public.profiles p
  where p.id = any(coalesce(_ids, '{}'::uuid[]))
  limit 5000
$$;

revoke execute on function public.display_names(uuid[]) from public;
grant execute on function public.display_names(uuid[]) to authenticated;
grant execute on function public.display_names(uuid[]) to service_role;
