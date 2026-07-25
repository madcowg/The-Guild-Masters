-- RLS + privileged RPCs. Business rules enforced here (not just the
-- client): no self-review, rank ceiling on approvals, Rank B/A/S always
-- needs the Guild Council, venue changes are admin-only.

create or replace function is_admin(uid uuid)
returns boolean
language sql
stable
as $$
  select coalesce((select p.is_admin from profiles p where p.id = uid), false);
$$;

create or replace function my_profile()
returns profiles
language sql
stable
as $$
  select * from profiles where id = auth.uid();
$$;

alter table chapters enable row level security;
alter table venues enable row level security;
alter table venue_history enable row level security;
alter table profiles enable row level security;
alter table postings enable row level security;
alter table disputes enable row level security;
alter table steward_log enable row level security;
alter table id_verifications enable row level security;
alter table payment_accounts enable row level security;
alter table transactions enable row level security;

-- Chapters/venues: readable by anyone signed in; writes only via the RPCs
-- below (no INSERT/UPDATE/DELETE policy for regular authenticated users —
-- service-role/RPC only).
create policy chapters_select on chapters for select using (auth.role() = 'authenticated');
create policy venues_select on venues for select using (auth.role() = 'authenticated');
create policy venue_history_select on venue_history for select using (auth.role() = 'authenticated');

-- Profiles: readable by anyone signed in (needed to show employer/taker
-- names, ranks, avatars); self-updatable EXCEPT privileged columns
-- (enforced by the trigger in 0001, not by this policy).
create policy profiles_select on profiles for select using (auth.role() = 'authenticated');
create policy profiles_update_self on profiles for update using (auth.uid() = id);
create policy profiles_insert_self on profiles for insert with check (auth.uid() = id);

-- Postings: open/sealed/active/done visible to everyone; pendingReview
-- visible only to the employer themselves or to admins/eligible stewards.
create policy postings_select on postings for select using (
  status <> 'pendingReview'
  or employer_id = auth.uid()
  or is_admin(auth.uid())
  or exists (
    select 1 from profiles s
    where s.id = auth.uid()
      and s.is_steward
      and rank_index(s.rank) >= 4
      and rank_index(postings.rank) < 4
      and rank_index(s.rank) > rank_index(postings.rank)
  )
);
create policy postings_insert on postings for insert with check (employer_id = auth.uid());
-- No client-side UPDATE policy for postings: approvals/rejections/disputes
-- flow only through the SECURITY DEFINER functions below.

create policy disputes_select on disputes for select using (
  raised_by = auth.uid() or against = auth.uid() or is_admin(auth.uid())
  or exists (select 1 from profiles s where s.id = auth.uid() and s.is_steward and rank_index(s.rank) >= 4)
);

create policy steward_log_select on steward_log for select using (
  is_admin(auth.uid()) or actor_id = auth.uid()
);

create policy id_verifications_select on id_verifications for select using (
  profile_id = auth.uid() or is_admin(auth.uid())
);
create policy id_verifications_insert on id_verifications for insert with check (profile_id = auth.uid());

create policy payment_accounts_select on payment_accounts for select using (
  profile_id = auth.uid() or is_admin(auth.uid())
);
create policy transactions_select on transactions for select using (
  payer_id = auth.uid() or payee_id = auth.uid() or is_admin(auth.uid())
);

-- ---------------------------------------------------------------------
-- Privileged RPCs (SECURITY DEFINER — run as table owner, bypass RLS
-- internally, but each one re-checks the caller's rights explicitly).
-- ---------------------------------------------------------------------

-- A steward may approve a request strictly below their own rank; Rank
-- B/A/S requests, and a steward's own postings, always fall through to
-- the Guild Council (admin) instead.
create or replace function review_posting(p_posting_id uuid, p_approve boolean)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  caller profiles;
  target postings;
  acted_as_steward boolean;
begin
  select * into caller from profiles where id = auth.uid();
  select * into target from postings where id = p_posting_id;
  if target is null then
    raise exception 'posting not found';
  end if;

  acted_as_steward :=
    caller.is_steward
    and rank_index(caller.rank) >= 4
    and caller.id <> target.employer_id
    and rank_index(target.rank) < 4
    and rank_index(caller.rank) > rank_index(target.rank);

  if not (acted_as_steward or caller.is_admin) then
    raise exception 'not authorized to review this posting';
  end if;

  update postings
    set status = case when p_approve then 'open' else 'rejected' end
    where id = p_posting_id;

  insert into steward_log (actor_id, actor_label, action, target_type, target_id, title)
  values (
    caller.id,
    case when acted_as_steward then caller.display_name else 'the Guild Council' end,
    case when p_approve then 'approved' else 'rejected' end,
    'posting', p_posting_id, target.title
  );
end;
$$;

-- Resolving a dispute: a steward must recuse if they're either party to
-- it (raised_by/against) — real recusal is possible here (unlike the
-- single-player prototype) because disputes involve two distinct users.
create or replace function resolve_dispute(p_dispute_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  caller profiles;
  target disputes;
  target_posting postings;
  acted_as_steward boolean;
begin
  select * into caller from profiles where id = auth.uid();
  select * into target from disputes where id = p_dispute_id;
  if target is null then
    raise exception 'dispute not found';
  end if;
  if target.posting_id is not null then
    select * into target_posting from postings where id = target.posting_id;
  end if;

  acted_as_steward :=
    caller.is_steward
    and rank_index(caller.rank) >= 4
    and caller.id not in (target.raised_by, target.against)
    and target_posting is not null
    and rank_index(target_posting.rank) < 4
    and rank_index(caller.rank) > rank_index(target_posting.rank);

  if not (acted_as_steward or caller.is_admin) then
    raise exception 'not authorized to resolve this dispute';
  end if;

  update disputes
    set status = 'resolved',
        resolved_by = caller.id,
        resolver_label = case when acted_as_steward then caller.display_name else 'the Guild Council' end,
        resolved_at = now()
    where id = p_dispute_id;

  insert into steward_log (actor_id, actor_label, action, target_type, target_id, title)
  values (
    caller.id,
    case when acted_as_steward then caller.display_name else 'the Guild Council' end,
    'resolved the dispute on', 'dispute', p_dispute_id, target.title
  );
end;
$$;

-- Exactly one active venue per chapter; only the Guild Council (admin)
-- may change it — never a player or steward, regardless of rank.
create or replace function admin_set_active_venue(p_chapter_id uuid, p_venue_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  caller profiles;
  venue_name text;
begin
  select * into caller from profiles where id = auth.uid();
  if not caller.is_admin then
    raise exception 'only the Guild Council may change a chapter''s venue';
  end if;

  update venue_history set ended_at = now()
    where chapter_id = p_chapter_id and ended_at is null;

  insert into venue_history (chapter_id, venue_id, set_by)
  values (p_chapter_id, p_venue_id, caller.id);

  update chapters set active_venue_id = p_venue_id where id = p_chapter_id;

  select name into venue_name from venues where id = p_venue_id;

  insert into steward_log (actor_id, actor_label, action, target_type, target_id, title)
  values (caller.id, caller.display_name, 'set the active venue to', 'venue', p_venue_id, venue_name);
end;
$$;

-- Admin-only role grants (isAdmin is rank-independent; isSteward still
-- only takes effect client-side/RPC-side at Rank B+).
create or replace function admin_set_role(p_profile_id uuid, p_is_admin boolean default null, p_is_steward boolean default null)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  caller profiles;
begin
  select * into caller from profiles where id = auth.uid();
  if not caller.is_admin then
    raise exception 'only the Guild Council may change roles';
  end if;

  update profiles set
    is_admin = coalesce(p_is_admin, is_admin),
    is_steward = coalesce(p_is_steward, is_steward)
  where id = p_profile_id;

  insert into steward_log (actor_id, actor_label, action, target_type, target_id, title)
  values (caller.id, caller.display_name, 'updated roles for', 'role', p_profile_id,
    coalesce((select display_name from profiles where id = p_profile_id), 'unknown member'));
end;
$$;

-- Manual ID-verification review (no third-party vendor yet — deferred
-- per CLAUDE.md until one is chosen + legal review is done).
create or replace function admin_review_id_verification(p_verification_id uuid, p_approve boolean)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  caller profiles;
  target id_verifications;
begin
  select * into caller from profiles where id = auth.uid();
  if not caller.is_admin then
    raise exception 'only the Guild Council may review ID verification';
  end if;

  select * into target from id_verifications where id = p_verification_id;
  if target is null then
    raise exception 'verification request not found';
  end if;

  update id_verifications set
    status = case when p_approve then 'verified' else 'rejected' end,
    reviewed_by = caller.id,
    reviewed_at = now()
  where id = p_verification_id;

  update profiles set
    id_verification_status = case when p_approve then 'verified' else 'rejected' end
  where id = target.profile_id;

  insert into steward_log (actor_id, actor_label, action, target_type, target_id, title)
  values (caller.id, caller.display_name, case when p_approve then 'verified' else 'rejected' end,
    'id_verification', p_verification_id, 'ID verification');
end;
$$;
