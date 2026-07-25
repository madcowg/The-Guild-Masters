-- Launch starts with a single chapter, and profiles never had a chapter_id
-- assignment path (caught during live testing: Admin Console couldn't load
-- venues for a real signed-up profile). Auto-assign the earliest-created
-- chapter until multi-chapter selection exists (see CLAUDE.md Tier 5).
create or replace function default_profile_chapter()
returns trigger
language plpgsql
as $$
begin
  if new.chapter_id is null then
    select id into new.chapter_id from chapters order by created_at limit 1;
  end if;
  return new;
end;
$$;

create trigger profiles_default_chapter
  before insert on profiles
  for each row execute function default_profile_chapter();
