-- The Guild Masters — core schema
-- Ranks: F -> E -> D -> C -> B -> A -> S (index 0-6). See CLAUDE.md for the
-- game-design rules this mirrors (rank gates, stat reward bands, etc).

create extension if not exists "pgcrypto";

-- Maps a rank letter to its ladder position, used throughout RLS/RPC to
-- enforce "steward may only approve a request strictly below their own rank".
create or replace function rank_index(r text)
returns int
language sql
immutable
as $$
  select array_position(array['F','E','D','C','B','A','S'], r) - 1;
$$;

create table chapters (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  theme text not null default 'high_fantasy',
  active_venue_id uuid, -- fk added after venues exists
  created_at timestamptz not null default now()
);

create table venues (
  id uuid primary key default gen_random_uuid(),
  chapter_id uuid not null references chapters(id) on delete cascade,
  name text not null,
  address text not null,
  lat double precision not null,
  lng double precision not null,
  geofence_radius_m integer not null default 150,
  promo_terms text,
  is_partner_active boolean not null default true,
  created_at timestamptz not null default now()
);

alter table chapters
  add constraint chapters_active_venue_fk
  foreign key (active_venue_id) references venues(id) on delete set null;

-- Audit trail of which venue was "The Tavern" for a chapter and when —
-- one active venue per chapter at a time, changeable only by the Guild
-- Council (admin), never by players or stewards regardless of rank.
create table venue_history (
  id uuid primary key default gen_random_uuid(),
  chapter_id uuid not null references chapters(id) on delete cascade,
  venue_id uuid not null references venues(id) on delete cascade,
  set_by uuid not null references auth.users(id),
  started_at timestamptz not null default now(),
  ended_at timestamptz
);

create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  chapter_id uuid references chapters(id),
  display_name text not null default '',
  rank text not null default 'F' check (rank in ('F','E','D','C','B','A','S')),
  xp integer not null default 0,
  scrip integer not null default 25,
  stats jsonb not null default '{"STR":5,"DEX":5,"CON":5,"INT":5,"WIS":5,"CHA":5}',
  avatar_url text,
  age_confirmed boolean not null default false,
  -- Rank-independent: reflects that in the real product this is platform
  -- staff, not a ranked player promoting themselves.
  is_admin boolean not null default false,
  -- Only takes effect at Rank B+ — enforced in application logic and RPCs,
  -- not just the client (see canStewardApprove in app/src/App.jsx).
  is_steward boolean not null default false,
  id_verification_status text not null default 'unverified'
    check (id_verification_status in ('unverified','pending','verified','rejected')),
  stripe_connect_account_id text,
  created_at timestamptz not null default now()
);

-- Column-level protection: rank/xp/scrip/is_admin/is_steward/id_verification_status
-- must never be self-editable by the row owner — only via SECURITY DEFINER
-- RPCs (rank trials, admin role grants, id-verification review, quest
-- rewards). RLS handles row access; this trigger handles column access.
create or replace function guard_profile_privileged_columns()
returns trigger
language plpgsql
as $$
begin
  if auth.uid() = new.id and not coalesce(current_setting('request.jwt.claims', true)::jsonb ->> 'role' = 'service_role', false) then
    if new.rank is distinct from old.rank
      or new.xp is distinct from old.xp
      or new.scrip is distinct from old.scrip
      or new.is_admin is distinct from old.is_admin
      or new.is_steward is distinct from old.is_steward
      or new.id_verification_status is distinct from old.id_verification_status then
      raise exception 'privileged profile columns can only change via a server-side function';
    end if;
  end if;
  return new;
end;
$$;

create trigger profiles_guard_privileged
  before update on profiles
  for each row execute function guard_profile_privileged_columns();

create table postings (
  id uuid primary key default gen_random_uuid(),
  chapter_id uuid not null references chapters(id),
  employer_id uuid not null references profiles(id),
  taker_id uuid references profiles(id),
  rank text not null check (rank in ('F','E','D','C','B','A','S')),
  title text not null,
  description text not null,
  type text not null,
  stats jsonb not null default '{}',
  scrip integer not null default 0,
  is_barter boolean not null default false,
  barter_for text,
  status text not null default 'pendingReview'
    check (status in ('pendingReview','open','sealed','active','done','rejected')),
  tavern_only boolean not null default false,
  disputed boolean not null default false,
  my_rating integer check (my_rating between 1 and 5),
  created_at timestamptz not null default now()
);

-- New postings always enter review — never trust a client-supplied status.
create or replace function force_posting_pending_review()
returns trigger
language plpgsql
as $$
begin
  new.status := 'pendingReview';
  new.disputed := false;
  return new;
end;
$$;

create trigger postings_force_pending_review
  before insert on postings
  for each row execute function force_posting_pending_review();

create table disputes (
  id uuid primary key default gen_random_uuid(),
  posting_id uuid references postings(id),
  -- 'employer_dispute': the poster rated their taker poorly (self-filed).
  -- 'taker_dispute': the taker rated the employer poorly (self-filed).
  kind text not null check (kind in ('employer_dispute','taker_dispute')),
  raised_by uuid not null references profiles(id),
  against uuid not null references profiles(id),
  rating integer not null check (rating between 1 and 5),
  title text not null,
  status text not null default 'open' check (status in ('open','resolved')),
  resolved_by uuid references profiles(id),
  resolver_label text, -- e.g. "the Guild Council" for admin/system resolutions
  resolved_at timestamptz,
  created_at timestamptz not null default now()
);

create table steward_log (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references profiles(id), -- null for system/Council actions
  actor_label text not null,
  action text not null,
  target_type text not null check (target_type in ('posting','dispute','venue','role','id_verification')),
  target_id uuid not null,
  title text not null,
  created_at timestamptz not null default now()
);

-- Private bucket; see storage policies in 0002. Manual review for now —
-- no third-party ID-verification vendor integrated yet (deferred, needs a
-- vendor choice + legal review per CLAUDE.md Tier 1).
create table id_verifications (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references profiles(id),
  file_path text not null,
  status text not null default 'pending' check (status in ('pending','verified','rejected')),
  reviewed_by uuid references profiles(id),
  reviewed_at timestamptz,
  created_at timestamptz not null default now()
);

create table payment_accounts (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null unique references profiles(id),
  stripe_account_id text,
  onboarding_status text not null default 'not_started'
    check (onboarding_status in ('not_started','pending','complete')),
  created_at timestamptz not null default now()
);

create table transactions (
  id uuid primary key default gen_random_uuid(),
  posting_id uuid references postings(id),
  payer_id uuid not null references profiles(id),
  payee_id uuid not null references profiles(id),
  amount_cents integer not null check (amount_cents >= 0),
  currency text not null default 'usd',
  stripe_payment_intent_id text,
  status text not null default 'pending'
    check (status in ('pending','succeeded','failed','refunded')),
  created_at timestamptz not null default now()
);

create index postings_chapter_status_idx on postings (chapter_id, status);
create index disputes_status_idx on disputes (status);
create index steward_log_target_idx on steward_log (target_type, target_id);
create index id_verifications_status_idx on id_verifications (status);
