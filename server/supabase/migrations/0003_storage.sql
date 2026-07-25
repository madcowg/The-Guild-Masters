-- Private bucket for ID-verification uploads. Files are stored under
-- `<profile_id>/<filename>` so ownership can be checked from the path.

insert into storage.buckets (id, name, public)
values ('id-verifications', 'id-verifications', false)
on conflict (id) do nothing;

create policy id_verification_uploads_insert
  on storage.objects for insert
  with check (
    bucket_id = 'id-verifications'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy id_verification_uploads_select
  on storage.objects for select
  using (
    bucket_id = 'id-verifications'
    and (
      (storage.foldername(name))[1] = auth.uid()::text
      or is_admin(auth.uid())
    )
  );
