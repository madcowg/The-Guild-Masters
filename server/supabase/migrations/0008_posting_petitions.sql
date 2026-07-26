-- Real petition/seal lifecycle for postings, replacing the fully
-- client-simulated SEED_PETITIONERS flow. A petitioner applies to an open
-- posting; the employer may decline directly (RLS), but sealing a winner
-- must go through the quest-seal Edge Function (it also captures the
-- Stripe hold), so there is deliberately no RLS path to 'sealed'.

create table posting_petitions (
  id uuid primary key default gen_random_uuid(),
  posting_id uuid not null references postings(id) on delete cascade,
  petitioner_id uuid not null references profiles(id),
  status text not null default 'pending'
    check (status in ('pending','declined','sealed','withdrawn')),
  created_at timestamptz not null default now(),
  decided_at timestamptz,
  unique (posting_id, petitioner_id)
);

create index posting_petitions_posting_idx on posting_petitions (posting_id, status);
create index posting_petitions_petitioner_idx on posting_petitions (petitioner_id, status);

alter table posting_petitions enable row level security;

-- Select: the petitioner themselves, the posting's employer, or an admin.
create policy posting_petitions_select on posting_petitions for select using (
  petitioner_id = auth.uid()
  or is_admin(auth.uid())
  or exists (
    select 1 from postings p
    where p.id = posting_petitions.posting_id and p.employer_id = auth.uid()
  )
);

-- Insert: only the caller petitioning for themselves, only on an open
-- posting that isn't their own, and only if their rank is at or below the
-- posting's rank. Party-boosted eligibility and tavern_only check-in are
-- explicitly out of scope for this migration (see CLAUDE.md).
create policy posting_petitions_insert on posting_petitions for insert with check (
  petitioner_id = auth.uid()
  and exists (
    select 1 from postings p, profiles me
    where p.id = posting_petitions.posting_id
      and me.id = auth.uid()
      and p.status = 'open'
      and p.employer_id <> auth.uid()
      and rank_index(p.rank) <= rank_index(me.rank)
  )
);

-- Update: the posting's employer may decline a pending petition directly.
-- Sealing is NOT reachable here -- quest-seal (service role) is the only
-- path to status = 'sealed', since sealing must happen atomically with
-- the Stripe capture.
create policy posting_petitions_update_decline on posting_petitions for update using (
  status = 'pending'
  and exists (
    select 1 from postings p
    where p.id = posting_petitions.posting_id and p.employer_id = auth.uid()
  )
) with check (
  status = 'declined'
);
