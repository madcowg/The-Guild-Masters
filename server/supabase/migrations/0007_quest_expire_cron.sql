-- Daily sweep for unclaimed quests: cancels the 7-day-old payment hold
-- and marks the posting 'expired' (see quest-expire-sweep Edge Function).
--
-- The shared secret authorizing the cron -> Edge Function call is
-- generated here with gen_random_bytes and stored only in Supabase
-- Vault — it's never a literal value in this file, in git history, or in
-- the Edge Function's own env vars. The function verifies a presented
-- token via check_cron_secret() below, which checks it against Vault
-- directly, so there's exactly one copy of the secret anywhere.
create extension if not exists pg_cron with schema extensions;
create extension if not exists pg_net with schema extensions;

select vault.create_secret(encode(gen_random_bytes(24), 'hex'), 'quest_expire_sweep_secret');

create or replace function check_cron_secret(token text)
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1 from vault.decrypted_secrets
    where name = 'quest_expire_sweep_secret' and decrypted_secret = token
  );
$$;

select cron.schedule(
  'quest-expire-sweep-daily',
  '0 6 * * *',
  $$
  select net.http_post(
    url := 'https://dulcrxolmktmxfxmhtjp.supabase.co/functions/v1/quest-expire-sweep',
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'quest_expire_sweep_secret'),
      'Content-Type', 'application/json'
    ),
    body := '{}'::jsonb
  );
  $$
);
