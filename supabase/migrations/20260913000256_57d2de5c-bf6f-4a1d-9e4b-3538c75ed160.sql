-- Client logo uploads are an admin/brand-team action (admin Logo Hub only).
-- Previously ANY signed-in user could write into the shared bucket.
drop policy if exists "Authenticated can upload client-logos" on storage.objects;

create policy "Brand team can upload client-logos"
on storage.objects for insert to authenticated
with check (
  bucket_id = 'client-logos'
  and (
    has_role(auth.uid(), 'admin'::app_role)
    or has_role(auth.uid(), 'brand_lead'::app_role)
    or has_role(auth.uid(), 'brand_reviewer'::app_role)
  )
);

-- The update policy had no WITH CHECK, so a permitted row could be moved
-- to another bucket. Re-create it with a matching check.
drop policy if exists "Owner or admin can update client-logos" on storage.objects;

create policy "Owner or admin can update client-logos"
on storage.objects for update to authenticated
using (
  bucket_id = 'client-logos'
  and (
    owner = auth.uid()
    or has_role(auth.uid(), 'admin'::app_role)
    or has_role(auth.uid(), 'brand_reviewer'::app_role)
  )
)
with check (
  bucket_id = 'client-logos'
  and (
    owner = auth.uid()
    or has_role(auth.uid(), 'admin'::app_role)
    or has_role(auth.uid(), 'brand_reviewer'::app_role)
  )
);
