-- Two additions closing the real posting lifecycle's loop: (1) dispute
-- raising has never been a persisted, explicit action before -- only ever
-- a side-effect baked into a posting's own `disputed` column; (2) the
-- taker's rating of the employer becomes real too, symmetric with the
-- employer's existing `my_rating` of the taker.

alter table postings add column taker_rating integer check (taker_rating between 1 and 5);

create or replace function raise_dispute(p_posting_id uuid, p_rating integer)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  caller profiles;
  target postings;
  v_kind text;
  v_against uuid;
  v_dispute_id uuid;
begin
  select * into caller from profiles where id = auth.uid();
  if caller is null then
    raise exception 'not authenticated';
  end if;

  select * into target from postings where id = p_posting_id;
  if target is null then
    raise exception 'posting not found';
  end if;

  if p_rating is null or p_rating < 1 or p_rating > 5 then
    raise exception 'rating must be between 1 and 5';
  end if;

  if target.status not in ('sealed', 'done') then
    raise exception 'disputes can only be raised on a sealed or completed posting';
  end if;

  if target.employer_id = auth.uid() then
    v_kind := 'employer_dispute';
    v_against := target.taker_id;
  elsif target.taker_id = auth.uid() then
    v_kind := 'taker_dispute';
    v_against := target.employer_id;
  else
    raise exception 'only the posting''s employer or taker may raise a dispute on it';
  end if;

  if v_against is null then
    raise exception 'posting has no counterparty yet';
  end if;

  insert into disputes (posting_id, kind, raised_by, against, rating, title)
  values (p_posting_id, v_kind, auth.uid(), v_against, p_rating, target.title)
  returning id into v_dispute_id;

  update postings set disputed = true where id = p_posting_id;

  return v_dispute_id;
end;
$$;

-- Taker rates the employer once the posting is done. Mirrors quest-complete's
-- own inlined disputed-flag pattern rather than requiring a second client
-- round-trip: a low rating raises the dispute in the same call.
create or replace function rate_employer(p_posting_id uuid, p_rating integer)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  target postings;
begin
  select * into target from postings where id = p_posting_id;
  if target is null then
    raise exception 'posting not found';
  end if;
  if target.taker_id <> auth.uid() then
    raise exception 'only the posting''s taker may rate the employer';
  end if;
  if target.status <> 'done' then
    raise exception 'posting is not yet complete';
  end if;
  if p_rating is null or p_rating < 1 or p_rating > 5 then
    raise exception 'rating must be between 1 and 5';
  end if;

  update postings set taker_rating = p_rating where id = p_posting_id;

  if p_rating <= 2 then
    perform raise_dispute(p_posting_id, p_rating);
  end if;
end;
$$;
