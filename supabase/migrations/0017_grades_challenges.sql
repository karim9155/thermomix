-- ============================================================
-- INOCASA / Thermomix Tunisie — advisors phase 5: grade criteria
-- and challenges
-- Run this AFTER 0016_affiliation.sql.
-- ============================================================

-- ---------- GRADE CRITERIA (F2) ----------
-- What it takes to REACH a grade, measured over the last `period_months`
-- months:
--   min_revenue   products TTC of the advisor's fully paid sales
--   min_sales     number of fully paid sales
--   min_recruits  direct recruits whose account became active
-- 0 means "no requirement". A grade whose criteria are all 0 is reachable
-- by anyone — the starting grade.
--
-- Meeting a higher grade's criteria doesn't promote anyone by itself: it
-- puts the advisor on the admin's list of proposed promotions (F5), and
-- the admin decides (F6).

alter table grades
  add column if not exists min_revenue  numeric(12,3) not null default 0 check (min_revenue >= 0),
  add column if not exists min_sales    int not null default 0 check (min_sales >= 0),
  add column if not exists min_recruits int not null default 0 check (min_recruits >= 0),
  add column if not exists period_months int not null default 3 check (period_months between 1 and 24);

-- ---------- CHALLENGES (H) ----------
-- A challenge ranks advisors on one metric over a date range:
--   ventes   number of fully paid sales
--   robots   Thermomix robots in those sales
--   ca       products TTC of those sales
--   recrues  direct recruits activated
--
-- Winners are, at closing time: the top `winners_count` advisors, or —
-- when winners_count is null — everyone who reached `target`. Both can be
-- combined (top 3 among those who reached the target). The admin checks
-- the proposed list before it is final (H6).
--
-- status: brouillon (admin only) → publie (on every advisor's wall)
-- → cloture (results final, prizes paid into the ledger).

create table if not exists challenges (
  id            uuid primary key default gen_random_uuid(),
  title         text not null,
  description   text,
  image_url     text,
  metric        text not null check (metric in ('ventes', 'robots', 'ca', 'recrues')),
  target        numeric(12,3) check (target is null or target > 0),
  winners_count int check (winners_count is null or winners_count >= 1),
  reward_label  text,
  prize_amount  numeric(10,3) not null default 0 check (prize_amount >= 0),
  starts_on     date not null,
  ends_on       date not null,
  status        text not null default 'brouillon' check (status in ('brouillon', 'publie', 'cloture')),
  closed_at     timestamptz,
  closed_by     uuid references auth.users(id) on delete set null,
  created_by    uuid references auth.users(id) on delete set null,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  constraint challenges_dates_check check (ends_on >= starts_on),
  constraint challenges_winner_rule_check check (target is not null or winners_count is not null)
);

create index if not exists challenges_status_idx on challenges (status, ends_on desc);

drop trigger if exists challenges_set_updated_at on challenges;
create trigger challenges_set_updated_at
  before update on challenges
  for each row execute function set_updated_at();

alter table challenges enable row level security;
-- Intentionally no policies — service-role only.

create table if not exists challenge_winners (
  challenge_id uuid not null references challenges(id) on delete restrict,
  advisor_id   uuid not null references advisors(user_id) on delete restrict,
  rank         int not null,
  score        numeric(12,3) not null,
  prize_amount numeric(10,3) not null default 0,
  primary key (challenge_id, advisor_id)
);

alter table challenge_winners enable row level security;

-- Public bucket for challenge pictures, like product photos.
insert into storage.buckets (id, name, public)
values ('challenge-images', 'challenge-images', true)
on conflict (id) do nothing;

-- ---------- CLOSING (H6, H7) ----------
/**
 * Closes a challenge with the winners the admin confirmed, and pays each
 * one the prize as a 'challenge' line in the commission ledger — all in
 * one transaction, so a challenge is never closed without its prizes or
 * paid twice.
 *
 * p_winners: [{ "advisor_id": "...", "rank": 1, "score": 12 }, ...]
 *
 * The prize lands in the month the challenge ended, or the current month
 * if that one is already closed (commission_period_for).
 */
create or replace function close_challenge(p_challenge uuid, p_winners jsonb, p_actor uuid)
returns void language plpgsql as $$
declare
  c   challenges;
  w   record;
begin
  perform pg_advisory_xact_lock(hashtext('challenge:' || p_challenge::text));

  select * into c from challenges where id = p_challenge;
  if not found then
    raise exception 'challenge_introuvable';
  end if;
  if c.status <> 'publie' then
    raise exception 'challenge_non_publie: seul un challenge publié peut être clôturé.';
  end if;
  if c.ends_on >= tunis_today() then
    raise exception 'challenge_en_cours: le challenge n''est pas terminé.';
  end if;

  for w in
    select (x->>'advisor_id')::uuid as advisor_id,
           (x->>'rank')::int         as rank,
           (x->>'score')::numeric    as score
      from jsonb_array_elements(p_winners) as x
  loop
    insert into challenge_winners (challenge_id, advisor_id, rank, score, prize_amount)
    values (c.id, w.advisor_id, w.rank, w.score, c.prize_amount);

    if c.prize_amount > 0 then
      insert into commission_entries
        (advisor_id, period_month, kind, amount, event_date, label, details, created_by)
      values (
        w.advisor_id,
        commission_period_for(c.ends_on),
        'challenge',
        c.prize_amount,
        c.ends_on,
        'Challenge : ' || c.title,
        jsonb_build_object('challenge_id', c.id, 'rang', w.rank),
        p_actor
      );
    end if;
  end loop;

  update challenges
     set status = 'cloture', closed_at = now(), closed_by = p_actor
   where id = c.id;
end;
$$;

revoke all on function close_challenge(uuid, jsonb, uuid) from public, anon, authenticated;
grant execute on function close_challenge(uuid, jsonb, uuid) to service_role;
