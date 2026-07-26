-- Quest payment lifecycle: authorize (hold) when a posting is approved,
-- capture when the employer seals a taker ("paid in advance" — the
-- employer's card is charged right when they commit to a taker, not
-- when work finishes), transfer the taker's cut when the employer
-- confirms completion, and auto-cancel unclaimed holds after 7 days.
-- See CLAUDE.md for the full design rationale (why capture happens at
-- seal time rather than completion, why fee is added on top rather than
-- deducted from the payout, and the 1 scrip = $1 conversion).

alter table postings
  add column employer_payment_method_id text,
  add column payment_intent_id text,
  add column payment_status text not null default 'none'
    check (payment_status in ('none','authorized','captured','transferred','canceled','failed')),
  add column authorized_at timestamptz,
  add column captured_at timestamptz,
  add column transferred_at timestamptz;

-- 'expired' is new: a posting that sat open with no taker for 7 days,
-- distinct from 'rejected' (a steward/admin actively declined it).
alter table postings drop constraint postings_status_check;
alter table postings add constraint postings_status_check
  check (status in ('pendingReview','open','sealed','active','done','rejected','expired'));

alter table transactions
  add column platform_fee_cents integer not null default 0;

create index postings_payment_sweep_idx on postings (status, payment_status, authorized_at)
  where status = 'open' and payment_status = 'authorized';
