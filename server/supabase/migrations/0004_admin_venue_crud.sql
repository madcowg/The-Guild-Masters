-- Adding a new partner venue to a chapter's roster is also Guild
-- Council-only (same rationale as admin_set_active_venue in 0002).
create or replace function admin_create_venue(
  p_chapter_id uuid,
  p_name text,
  p_address text,
  p_lat double precision,
  p_lng double precision,
  p_geofence_radius_m integer default 150,
  p_promo_terms text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  caller profiles;
  new_id uuid;
begin
  select * into caller from profiles where id = auth.uid();
  if not caller.is_admin then
    raise exception 'only the Guild Council may add partner venues';
  end if;

  insert into venues (chapter_id, name, address, lat, lng, geofence_radius_m, promo_terms)
  values (p_chapter_id, p_name, p_address, p_lat, p_lng, p_geofence_radius_m, p_promo_terms)
  returning id into new_id;

  insert into steward_log (actor_id, actor_label, action, target_type, target_id, title)
  values (caller.id, caller.display_name, 'added partner venue', 'venue', new_id, p_name);

  return new_id;
end;
$$;
