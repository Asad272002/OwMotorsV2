-- Cover the remaining page-content actor foreign keys reported by the
-- Supabase performance advisor. These support audit and ownership queries.
create index content_pages_updated_by_idx
  on public.content_pages(updated_by)
  where updated_by is not null;

create index content_sections_archived_by_idx
  on public.content_sections(archived_by)
  where archived_by is not null;
