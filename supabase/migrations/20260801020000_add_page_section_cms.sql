-- OW Motors controlled page/section content system.
-- Draft fields are never granted to anonymous users. Public reads use the
-- published_page_sections view, which exposes only published snapshots.

create table public.content_pages (
  id uuid primary key default gen_random_uuid(),
  page_key text not null unique check (page_key in ('home', 'brands', 'motorcycles', 'about', 'contact', 'global')),
  name text not null check (char_length(btrim(name)) between 2 and 80),
  public_path text not null unique check (public_path in ('/', '/brands', '/motorcycles', '/about', '/contact', '/global')),
  is_active boolean not null default true,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  published_at timestamptz,
  updated_by uuid references public.profiles(id) on delete set null
);

create table public.content_sections (
  id uuid primary key default gen_random_uuid(),
  page_id uuid not null references public.content_pages(id) on delete cascade,
  section_type text not null check (section_type ~ '^[a-z][a-z0-9_]{1,63}$'),
  internal_name text not null check (char_length(btrim(internal_name)) between 2 and 120),
  draft_heading text not null default '' check (char_length(draft_heading) <= 180),
  draft_content jsonb not null default '{}'::jsonb check (jsonb_typeof(draft_content) = 'object'),
  draft_order integer not null default 0 check (draft_order >= 0),
  draft_visible boolean not null default true,
  draft_archived boolean not null default false,
  draft_version integer not null default 1 check (draft_version > 0),
  published_heading text,
  published_content jsonb check (published_content is null or jsonb_typeof(published_content) = 'object'),
  published_order integer check (published_order is null or published_order >= 0),
  published_visible boolean not null default false,
  published_archived boolean not null default false,
  created_by uuid references public.profiles(id) on delete set null,
  updated_by uuid references public.profiles(id) on delete set null,
  archived_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  published_at timestamptz,
  archived_at timestamptz
);

create table public.content_audit_events (
  id uuid primary key default gen_random_uuid(),
  page_id uuid not null references public.content_pages(id) on delete cascade,
  section_id uuid references public.content_sections(id) on delete set null,
  actor_id uuid references public.profiles(id) on delete set null,
  action text not null check (action in ('create', 'edit', 'duplicate', 'reorder', 'show', 'hide', 'publish', 'archive', 'restore')),
  summary text not null check (char_length(btrim(summary)) between 2 and 240),
  created_at timestamptz not null default timezone('utc', now())
);

create index content_sections_page_draft_order_idx on public.content_sections(page_id, draft_archived, draft_order);
create index content_sections_page_published_order_idx on public.content_sections(page_id, published_archived, published_visible, published_order);
create index content_sections_type_idx on public.content_sections(section_type);
create index content_sections_updated_by_idx on public.content_sections(updated_by);
create index content_sections_created_by_idx on public.content_sections(created_by);
create index content_audit_page_created_idx on public.content_audit_events(page_id, created_at desc);
create index content_audit_section_idx on public.content_audit_events(section_id) where section_id is not null;
create index content_audit_actor_idx on public.content_audit_events(actor_id) where actor_id is not null;

create trigger content_pages_set_updated_at
before update on public.content_pages
for each row execute function private.set_updated_at();

create trigger content_sections_set_updated_at
before update on public.content_sections
for each row execute function private.set_updated_at();

insert into public.content_pages (page_key, name, public_path)
values
  ('home', 'Home Page', '/'),
  ('brands', 'Brands Page', '/brands'),
  ('motorcycles', 'Motorcycles Page', '/motorcycles'),
  ('about', 'About Page', '/about'),
  ('contact', 'Contact Page', '/contact'),
  ('global', 'Global Content', '/global')
on conflict (page_key) do update set name = excluded.name, public_path = excluded.public_path;

-- Public-facing projection. It deliberately contains no draft fields, actor
-- IDs, internal archive metadata, or audit data.
create view public.published_page_sections
with (security_invoker = true)
as
select
  section.id,
  page.page_key,
  page.public_path,
  section.section_type,
  coalesce(section.published_heading, '') as heading,
  section.published_content as content,
  section.published_order as display_order,
  section.published_at
from public.content_sections as section
join public.content_pages as page on page.id = section.page_id
where page.is_active
  and section.published_content is not null
  and section.published_visible
  and not section.published_archived;

create or replace function public.move_content_section(target_section_id uuid, move_direction text)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare
  target_page_id uuid;
  current_order integer;
  adjacent_id uuid;
  adjacent_order integer;
begin
  if not (select private.is_staff()) then
    raise insufficient_privilege using message = 'Staff access is required.';
  end if;
  if move_direction not in ('up', 'down') then
    raise exception using errcode = '22023', message = 'Direction must be up or down.';
  end if;

  select page_id into target_page_id from public.content_sections where id = target_section_id and not draft_archived;
  if target_page_id is null then raise exception using errcode = 'P0002', message = 'Section not found.'; end if;

  with ordered as (
    select id, (row_number() over (order by draft_order, created_at, id) - 1)::integer as normalized_order
    from public.content_sections where page_id = target_page_id and not draft_archived
  )
  update public.content_sections as section
  set draft_order = ordered.normalized_order
  from ordered where section.id = ordered.id and section.draft_order is distinct from ordered.normalized_order;

  select draft_order into current_order from public.content_sections where id = target_section_id for update;
  select id, draft_order into adjacent_id, adjacent_order
  from public.content_sections
  where page_id = target_page_id and not draft_archived
    and draft_order = current_order + case when move_direction = 'up' then -1 else 1 end
  for update;
  if adjacent_id is null then return; end if;

  update public.content_sections set draft_order = case when id = target_section_id then adjacent_order else current_order end,
    draft_version = draft_version + 1,
    updated_by = (select auth.uid())
  where id in (target_section_id, adjacent_id);

  insert into public.content_audit_events(page_id, section_id, actor_id, action, summary)
  values (target_page_id, target_section_id, (select auth.uid()), 'reorder', 'Section order changed');
end;
$$;

create or replace function public.duplicate_content_section(target_section_id uuid)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  source public.content_sections%rowtype;
  new_id uuid;
begin
  if not (select private.is_staff()) then raise insufficient_privilege using message = 'Staff access is required.'; end if;
  select * into source from public.content_sections where id = target_section_id;
  if source.id is null then raise exception using errcode = 'P0002', message = 'Section not found.'; end if;

  update public.content_sections set draft_order = draft_order + 1, draft_version = draft_version + 1,
    updated_by = (select auth.uid())
  where page_id = source.page_id and not draft_archived and draft_order > source.draft_order;

  insert into public.content_sections(page_id, section_type, internal_name, draft_heading, draft_content, draft_order, draft_visible, created_by, updated_by)
  values (source.page_id, source.section_type, left(source.internal_name || ' copy', 120), source.draft_heading,
    source.draft_content, source.draft_order + 1, false, (select auth.uid()), (select auth.uid()))
  returning id into new_id;

  insert into public.content_audit_events(page_id, section_id, actor_id, action, summary)
  values (source.page_id, new_id, (select auth.uid()), 'duplicate', 'Section duplicated as a hidden draft');
  return new_id;
end;
$$;

create or replace function public.set_content_section_visibility(target_section_id uuid, target_visible boolean)
returns void language plpgsql security invoker set search_path = '' as $$
declare target_page_id uuid;
begin
  if not (select private.is_staff()) then raise insufficient_privilege using message = 'Staff access is required.'; end if;
  update public.content_sections set draft_visible = target_visible, draft_version = draft_version + 1,
    updated_by = (select auth.uid()) where id = target_section_id and not draft_archived returning page_id into target_page_id;
  if target_page_id is null then raise exception using errcode = 'P0002', message = 'Section not found.'; end if;
  insert into public.content_audit_events(page_id, section_id, actor_id, action, summary)
  values (target_page_id, target_section_id, (select auth.uid()), case when target_visible then 'show' else 'hide' end,
    case when target_visible then 'Section shown in draft' else 'Section hidden in draft' end);
end;
$$;

create or replace function public.archive_content_section(target_section_id uuid)
returns void language plpgsql security invoker set search_path = '' as $$
declare target_page_id uuid;
begin
  if not (select private.is_staff()) then raise insufficient_privilege using message = 'Staff access is required.'; end if;
  update public.content_sections set draft_archived = true, draft_visible = false, archived_at = timezone('utc', now()),
    archived_by = (select auth.uid()), updated_by = (select auth.uid()), draft_version = draft_version + 1
  where id = target_section_id and not draft_archived returning page_id into target_page_id;
  if target_page_id is null then raise exception using errcode = 'P0002', message = 'Section not found.'; end if;
  insert into public.content_audit_events(page_id, section_id, actor_id, action, summary)
  values (target_page_id, target_section_id, (select auth.uid()), 'archive', 'Section archived in draft');
end;
$$;

create or replace function public.restore_content_section(target_section_id uuid)
returns void language plpgsql security invoker set search_path = '' as $$
declare target_page_id uuid; next_order integer;
begin
  if not (select private.is_staff()) then raise insufficient_privilege using message = 'Staff access is required.'; end if;
  select page_id into target_page_id from public.content_sections where id = target_section_id and draft_archived;
  if target_page_id is null then raise exception using errcode = 'P0002', message = 'Archived section not found.'; end if;
  select coalesce(max(draft_order), -1) + 1 into next_order from public.content_sections where page_id = target_page_id and not draft_archived;
  update public.content_sections set draft_archived = false, draft_visible = false, draft_order = next_order,
    archived_at = null, archived_by = null, updated_by = (select auth.uid()), draft_version = draft_version + 1
  where id = target_section_id;
  insert into public.content_audit_events(page_id, section_id, actor_id, action, summary)
  values (target_page_id, target_section_id, (select auth.uid()), 'restore', 'Section restored as a hidden draft');
end;
$$;

create or replace function public.publish_content_page(target_page_id uuid)
returns void language plpgsql security invoker set search_path = '' as $$
begin
  if not (select private.is_staff()) then raise insufficient_privilege using message = 'Staff access is required.'; end if;
  if not exists (select 1 from public.content_pages where id = target_page_id and is_active) then
    raise exception using errcode = 'P0002', message = 'Page not found.';
  end if;

  update public.content_sections set
    published_heading = draft_heading,
    published_content = draft_content,
    published_order = draft_order,
    published_visible = draft_visible,
    published_archived = draft_archived,
    published_at = timezone('utc', now()),
    updated_by = (select auth.uid())
  where page_id = target_page_id;

  update public.content_pages set published_at = timezone('utc', now()), updated_by = (select auth.uid())
  where id = target_page_id;

  insert into public.content_audit_events(page_id, actor_id, action, summary)
  values (target_page_id, (select auth.uid()), 'publish', 'Page draft published');
end;
$$;

revoke all on table public.content_pages, public.content_sections, public.content_audit_events from anon, authenticated;
revoke all on public.published_page_sections from anon, authenticated;

grant select (id, page_key, name, public_path, is_active, published_at) on public.content_pages to anon, authenticated;
grant select (id, page_id, section_type, published_heading, published_content, published_order, published_visible, published_archived, published_at)
  on public.content_sections to anon;
grant select on public.published_page_sections to anon, authenticated;

grant select, insert, update on public.content_pages to authenticated;
grant select, insert, update, delete on public.content_sections to authenticated;
grant select, insert on public.content_audit_events to authenticated;
grant all privileges on public.content_pages, public.content_sections, public.content_audit_events to service_role;

alter table public.content_pages enable row level security;
alter table public.content_pages force row level security;
alter table public.content_sections enable row level security;
alter table public.content_sections force row level security;
alter table public.content_audit_events enable row level security;
alter table public.content_audit_events force row level security;

create policy content_pages_public_read on public.content_pages for select to anon, authenticated using (is_active);
create policy content_pages_staff_insert on public.content_pages for insert to authenticated with check ((select private.is_admin()));
create policy content_pages_staff_update on public.content_pages for update to authenticated using ((select private.is_staff())) with check ((select private.is_staff()));

create policy content_sections_public_read on public.content_sections for select to anon
using (published_content is not null and published_visible and not published_archived);
create policy content_sections_staff_read on public.content_sections for select to authenticated using ((select private.is_staff()));
create policy content_sections_staff_insert on public.content_sections for insert to authenticated with check ((select private.is_staff()));
create policy content_sections_staff_update on public.content_sections for update to authenticated using ((select private.is_staff())) with check ((select private.is_staff()));
create policy content_sections_admin_delete on public.content_sections for delete to authenticated using ((select private.is_admin()));

create policy content_audit_staff_read on public.content_audit_events for select to authenticated using ((select private.is_staff()));
create policy content_audit_staff_insert on public.content_audit_events for insert to authenticated with check ((select private.is_staff()) and actor_id = (select auth.uid()));
create policy content_audit_admin_delete on public.content_audit_events for delete to authenticated using ((select private.is_admin()));

revoke all on function public.move_content_section(uuid, text) from public, anon;
revoke all on function public.duplicate_content_section(uuid) from public, anon;
revoke all on function public.set_content_section_visibility(uuid, boolean) from public, anon;
revoke all on function public.archive_content_section(uuid) from public, anon;
revoke all on function public.restore_content_section(uuid) from public, anon;
revoke all on function public.publish_content_page(uuid) from public, anon;
grant execute on function public.move_content_section(uuid, text) to authenticated;
grant execute on function public.duplicate_content_section(uuid) to authenticated;
grant execute on function public.set_content_section_visibility(uuid, boolean) to authenticated;
grant execute on function public.archive_content_section(uuid) to authenticated;
grant execute on function public.restore_content_section(uuid) to authenticated;
grant execute on function public.publish_content_page(uuid) to authenticated;
