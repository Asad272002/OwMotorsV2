-- Publish one section without forcing unrelated page drafts live.
create or replace function public.publish_content_section(target_section_id uuid)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare target_page_id uuid;
begin
  if not (select private.is_staff()) then
    raise insufficient_privilege using message = 'Staff access is required.';
  end if;

  update public.content_sections
  set published_heading = draft_heading,
      published_content = draft_content,
      published_order = draft_order,
      published_visible = draft_visible,
      published_archived = draft_archived,
      published_at = timezone('utc', now()),
      updated_by = (select auth.uid())
  where id = target_section_id
  returning page_id into target_page_id;

  if target_page_id is null then
    raise exception using errcode = 'P0002', message = 'Section not found.';
  end if;

  update public.content_pages
  set published_at = timezone('utc', now()), updated_by = (select auth.uid())
  where id = target_page_id;

  insert into public.content_audit_events(page_id, section_id, actor_id, action, summary)
  values (target_page_id, target_section_id, (select auth.uid()), 'publish', 'Section draft published');
end;
$$;

revoke all on function public.publish_content_section(uuid) from public, anon;
grant execute on function public.publish_content_section(uuid) to authenticated;
