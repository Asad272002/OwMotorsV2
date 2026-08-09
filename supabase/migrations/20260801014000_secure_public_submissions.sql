begin;

-- Public submissions now pass through the validated server-only application
-- boundary. The publishable key must not be able to write these tables through
-- PostgREST and bypass rate limiting, spam checks, or application validation.
revoke insert on table public.contact_inquiries from anon, authenticated;
revoke insert (
  full_name,
  phone,
  email,
  subject,
  message
) on public.contact_inquiries from anon, authenticated;

revoke insert on table public.test_ride_requests from anon, authenticated;
revoke insert (
  motorcycle_id,
  variant_id,
  full_name,
  phone,
  email,
  preferred_date,
  preferred_time,
  message
) on public.test_ride_requests from anon, authenticated;

drop policy if exists contact_inquiries_public_insert on public.contact_inquiries;
drop policy if exists test_ride_requests_public_insert on public.test_ride_requests;

-- Staff workflow actions update status only. RLS still independently requires
-- an active editor/admin profile, and administrators retain delete access.
revoke update on table public.contact_inquiries from authenticated;
revoke update on table public.test_ride_requests from authenticated;
grant update (status) on public.contact_inquiries to authenticated;
grant update (status) on public.test_ride_requests to authenticated;

-- Keep explicit service-role access for the narrowly scoped server submission
-- client. The service role remains server-only and bypasses RLS by design.
grant insert on table public.contact_inquiries to service_role;
grant insert on table public.test_ride_requests to service_role;

alter table public.contact_inquiries
  add constraint contact_inquiries_email_length_valid
  check (char_length(email) <= 254);

alter table public.test_ride_requests
  add constraint test_ride_requests_email_length_valid
  check (email is null or char_length(email) <= 254);

-- Keep direct Storage uploads aligned with the application limit. The 900 KB
-- cap leaves multipart overhead below Next.js's default 1 MB action-body limit.
update storage.buckets
set file_size_limit = 921600
where id = 'motorcycles';

commit;
