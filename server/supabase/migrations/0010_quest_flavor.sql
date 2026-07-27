-- Local-LLM flavor text for quest postings: rewrites title/description for
-- theme/fun only. The original title/description columns remain the
-- authoritative contract everywhere server-side (Stripe metadata,
-- steward_log, disputes) and are never overwritten -- flavor_* is purely
-- cosmetic display text.
alter table postings add column flavor_title text;
alter table postings add column flavor_description text;
alter table postings add column flavor_status text not null default 'pending'
  check (flavor_status in ('pending','done','skipped'));

-- Force flavor fields to safe defaults on every insert, same as status/
-- disputed already are -- otherwise a client could insert a posting with
-- flavor_status: 'done' and arbitrary flavor text that a steward never
-- sees in its flavored form during review.
create or replace function force_posting_pending_review()
returns trigger
language plpgsql
as $$
begin
  new.status := 'pendingReview';
  new.disputed := false;
  new.flavor_status := 'pending';
  new.flavor_title := null;
  new.flavor_description := null;
  return new;
end;
$$;

-- Shared secret for the local quest-flavor worker, same pattern as
-- quest_expire_sweep_secret in 0007 -- generated server-side, never typed
-- or seen as a literal value anywhere, including this file.
select vault.create_secret(encode(gen_random_bytes(24), 'hex'), 'quest_flavor_worker_secret');

create or replace function check_flavor_secret(token text)
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1 from vault.decrypted_secrets
    where name = 'quest_flavor_worker_secret' and decrypted_secret = token
  );
$$;

-- Writes the worker's result back, or marks a posting skipped. The
-- "where flavor_status = 'pending'" guard is atomic (re-checked as part of
-- the single UPDATE), so a second/racing call is a harmless no-op.
create or replace function apply_quest_flavor(
  p_posting_id uuid,
  p_flavor_title text,
  p_flavor_description text,
  p_skip boolean default false
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  updated boolean;
begin
  if p_skip then
    update postings set flavor_status = 'skipped'
      where id = p_posting_id and flavor_status = 'pending';
  else
    update postings set flavor_title = p_flavor_title,
                         flavor_description = p_flavor_description,
                         flavor_status = 'done'
      where id = p_posting_id and flavor_status = 'pending';
  end if;
  get diagnostics updated = row_count;
  return updated;
end;
$$;
