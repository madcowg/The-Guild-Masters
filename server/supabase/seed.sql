-- Launch starts with a single guild chapter and no active venue yet — the
-- Guild Council sets the first venue via the Admin Console
-- (admin_set_active_venue), which also writes the first venue_history row.
insert into chapters (name, theme)
values ('High Fantasy Chapter', 'high_fantasy')
on conflict (name) do nothing;
