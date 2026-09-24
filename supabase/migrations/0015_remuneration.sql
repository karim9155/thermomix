-- ============================================================
-- INOCASA / Thermomix Tunisie — advisors phase 3: remuneration
-- Run this AFTER 0014_clients_bons_de_commande.sql.
-- ============================================================

-- How the money works (domain G):
--
--   * A sale earns commission only once it is FULLY PAID. The personal
--     sale bonus is an amount per Thermomix robot sold; accessories earn
--     nothing.
--   * A recruit's first fully paid sale earns their direct sponsor (N+1
--     only) a one-off recruitment bonus.
--   * Both amounts depend on the grade the beneficiary held on the day of
--     the event, and are set by the admin per grade in commission_rules,
--     with a start date — so changing an amount never rewrites the past.
--   * Everything earned in month M is payable on the 15th of M+1, when
--     month M is closed and locked.
--
-- The ledger (commission_entries) is append-only: a mistake or a
-- cancellation is corrected by a new, opposite line, never by editing
-- one. The rules that write to it live in this file, as functions that
-- take a lock — they run inside the database, where two simultaneous
-- admin clicks cannot both award the same commission.

-- ---------- RULES ----------

create table if not exists commission_rules (
  id                uuid primary key default gen_random_uuid(),
  grade_id          uuid not null references grades(id),
  -- Paid per Thermomix robot on a fully paid sale.
  robot_sale_bonus  numeric(10,3) not null check (robot_sale_bonus >= 0),
  -- Paid once to the direct sponsor when a recruit's first sale is fully paid.
  recruitment_bonus numeric(10,3) not null check (recruitment_bonus >= 0),
  effective_from    date not null,
  created_by        uuid references auth.users(id) on delete set null,
  created_at        timestamptz not null default now(),
  unique (grade_id, effective_from)
);

alter table commission_rules enable row level security;

-- Starting amounts for every existing grade: 450 DT per robot, and no
-- recruitment bonus until the admin sets one. Dated far back so they
-- cover every sale already in the system.
insert into commission_rules (grade_id, robot_sale_bonus, recruitment_bonus, effective_from)
select id, 450, 0, date '2000-01-01' from grades
on conflict (grade_id, effective_from) do nothing;

-- ---------- PERIODS ----------
-- One row per month. `ouverte` accepts new lines; `cloturee` is locked.
-- A period is closed on the 15th of the following month (by the cron, or
-- by the admin), and only a month already over can be closed — so the
-- current month is always open.

create table if not exists commission_periods (
  month      date primary key check (extract(day from month) = 1),
  status     text not null default 'ouverte' check (status in ('ouverte', 'cloturee')),
  closed_at  timestamptz,
  -- null when the cron closed it.
  closed_by  uuid references auth.users(id) on delete set null
);

alter table commission_periods enable row level security;

-- ---------- LEDGER ----------
-- kind:
--   vente        personal sale bonus (negative: clawback)
--   recrutement  recruitment bonus to the sponsor (negative: clawback)
--   challenge    challenge prize (phase 5)
--   ajustement   manual bonus or deduction by the admin, with a reason
--   report       carry-over of a negative balance to the next month
--
-- event_date is when the thing happened; period_month is the month it is
-- paid in. They differ when an event arrives after its month was closed:
-- it then lands in the current month rather than reopening a locked one.

create table if not exists commission_entries (
  id           bigint generated always as identity primary key,
  advisor_id   uuid not null references advisors(user_id) on delete restrict,
  period_month date not null references commission_periods(month),
  kind         text not null check (kind in ('vente', 'recrutement', 'challenge', 'ajustement', 'report')),
  amount       numeric(10,3) not null check (amount <> 0),
  event_date   date not null,
  order_id     uuid references orders(id) on delete restrict,
  recruit_id   uuid references advisors(user_id) on delete restrict,
  label        text not null,
  details      jsonb not null default '{}'::jsonb,
  created_by   uuid references auth.users(id) on delete set null,
  created_at   timestamptz not null default now()
);

create index if not exists commission_entries_advisor_period_idx
  on commission_entries (advisor_id, period_month);
create index if not exists commission_entries_order_idx on commission_entries (order_id);
create index if not exists commission_entries_recruit_idx on commission_entries (recruit_id, kind);
create index if not exists commission_entries_period_idx on commission_entries (period_month);

alter table commission_entries enable row level security;

-- Append-only, even for the service role.
create or replace function commission_entries_append_only()
returns trigger language plpgsql as $$
begin
  raise exception 'commission_entries est en ajout seul : corrigez par une ligne inverse.';
end;
$$;

drop trigger if exists commission_entries_append_only on commission_entries;
create trigger commission_entries_append_only
  before update or delete on commission_entries
  for each row execute function commission_entries_append_only();

-- A closed period is locked against any new line (G11).
create or replace function commission_entries_period_open()
returns trigger language plpgsql as $$
begin
  if (select status from commission_periods where month = new.period_month) <> 'ouverte' then
    raise exception 'periode_cloturee: la période % est clôturée.', to_char(new.period_month, 'MM/YYYY');
  end if;
  return new;
end;
$$;

drop trigger if exists commission_entries_period_open on commission_entries;
create trigger commission_entries_period_open
  before insert on commission_entries
  for each row execute function commission_entries_period_open();

-- ---------- PAYOUTS ----------
-- What was actually paid to whom for a closed month (G13). Separate from
-- the ledger: the ledger says what was earned, this says it was handed
-- over. One row per advisor per month.

create table if not exists commission_payouts (
  period_month date not null references commission_periods(month),
  advisor_id   uuid not null references advisors(user_id) on delete restrict,
  amount       numeric(10,3) not null check (amount > 0),
  paid_at      date not null,
  method       text check (method in ('especes', 'cheque', 'virement')),
  reference    text,
  recorded_by  uuid references auth.users(id) on delete set null,
  created_at   timestamptz not null default now(),
  primary key (period_month, advisor_id)
);

alter table commission_payouts enable row level security;

-- ---------- HELPERS ----------

create or replace function tunis_today()
returns date language sql stable as $$
  select (now() at time zone 'Africa/Tunis')::date
$$;

/**
 * The month a line dated p_date is paid in: its own month if still open,
 * otherwise the current month (which is always open).
 */
create or replace function commission_period_for(p_date date)
returns date language plpgsql as $$
declare
  m date := date_trunc('month', p_date)::date;
  s text;
begin
  insert into commission_periods (month) values (m) on conflict do nothing;
  select status into s from commission_periods where month = m;
  if s = 'ouverte' then
    return m;
  end if;

  m := date_trunc('month', tunis_today())::date;
  insert into commission_periods (month) values (m) on conflict do nothing;
  return m;
end;
$$;

/** The grade an advisor held on a given day, from their grade history. */
create or replace function advisor_grade_at(p_advisor uuid, p_date date)
returns uuid language sql stable as $$
  select coalesce(
    (select to_grade_id
       from advisor_grade_history
      where advisor_id = p_advisor
        and (effective_at at time zone 'Africa/Tunis')::date <= p_date
      order by effective_at desc
      limit 1),
    (select grade_id from advisors where user_id = p_advisor)
  )
$$;

/** The rule in force for a grade on a given day. */
create or replace function commission_rule_at(p_grade uuid, p_date date)
returns commission_rules language sql stable as $$
  select *
    from commission_rules
   where grade_id = p_grade and effective_from <= p_date
   order by effective_from desc
   limit 1
$$;

/** Fully paid, whichever way the order was sold. */
create or replace function order_is_fully_paid(o orders)
returns boolean language sql immutable as $$
  select (o.source = 'conseiller' and o.sale_status = 'paye')
      or (o.source = 'web' and o.status = 'payee')
$$;

-- ---------- ENGINE: SALE BONUS ----------

/**
 * Brings the sale-bonus lines of one order in line with what it should
 * have earned (G1), and returns nothing. Safe to call any number of times:
 *
 *   paid, nothing recorded yet     → one positive line
 *   no longer paid (undone, cancelled) → one negative line (clawback)
 *   already right                  → nothing
 *
 * What it "should have earned" is fixed by the paid date — robots on the
 * order × the rule for the advisor's grade on that date — so calling it
 * again later never produces a different amount.
 *
 * Works per advisor, so if an order is ever reattributed (phase 4) the
 * previous advisor's line is reversed and the new advisor's is written.
 */
create or replace function reconcile_sale_commission(p_order uuid, p_actor uuid)
returns void language plpgsql as $$
declare
  o         orders;
  paid      boolean;
  ev        date;
  robots    int := 0;
  rule      commission_rules;
  expected  numeric := 0;
  rec       record;
  delta     numeric;
  line_date date;
begin
  perform pg_advisory_xact_lock(hashtext('commission:vente:' || p_order::text));

  select * into o from orders where id = p_order;
  if not found then
    return;
  end if;

  paid := o.advisor_id is not null and order_is_fully_paid(o);

  if paid then
    ev := coalesce((o.paid_at at time zone 'Africa/Tunis')::date, tunis_today());

    select coalesce(sum(oi.quantity), 0) into robots
      from order_items oi
      join products p on p.sku = oi.sku
     where oi.order_id = o.id and p.category = 'robot';

    rule := commission_rule_at(advisor_grade_at(o.advisor_id, ev), ev);
    expected := robots * coalesce(rule.robot_sale_bonus, 0);
  end if;

  for rec in
    select advisor_id, sum(amount) as total
      from commission_entries
     where order_id = o.id and kind = 'vente'
     group by advisor_id
    union
    select o.advisor_id, 0
     where paid
       and not exists (
         select 1 from commission_entries
          where order_id = o.id and kind = 'vente' and advisor_id = o.advisor_id
       )
  loop
    delta := (case when paid and rec.advisor_id = o.advisor_id then expected else 0 end) - rec.total;
    continue when delta = 0;

    -- A gain is dated on the day the sale was paid; a clawback on the
    -- day it happened.
    line_date := case when delta > 0 then ev else tunis_today() end;

    insert into commission_entries
      (advisor_id, period_month, kind, amount, event_date, order_id, label, details, created_by)
    values (
      rec.advisor_id,
      commission_period_for(line_date),
      'vente',
      delta,
      line_date,
      o.id,
      case when delta > 0
        then 'Prime de vente ' || o.reference
        else 'Reprise sur vente ' || o.reference
      end,
      jsonb_build_object('reference', o.reference, 'robots', robots),
      p_actor
    );
  end loop;

  if o.advisor_id is not null then
    perform reconcile_recruitment_bonus(o.advisor_id, p_actor);
  end if;
end;
$$;

-- ---------- ENGINE: RECRUITMENT BONUS ----------

/**
 * The recruitment bonus for one recruit (G2): paid ONCE to their direct
 * sponsor when the recruit has a fully paid sale, taken back if that
 * stops being true (the only paid sale is cancelled). Idempotent, like
 * the sale bonus.
 *
 * Amount: the rule for the SPONSOR's grade on the date the recruit's
 * first sale was paid.
 */
create or replace function reconcile_recruitment_bonus(p_recruit uuid, p_actor uuid)
returns void language plpgsql as $$
declare
  first_sale record;
  net        numeric;
  sponsor    uuid;
  recruit    record;
  rule       commission_rules;
  rec        record;
begin
  perform pg_advisory_xact_lock(hashtext('commission:recrutement:' || p_recruit::text));

  select coalesce(sum(amount), 0) into net
    from commission_entries
   where recruit_id = p_recruit and kind = 'recrutement';

  select o.id, o.reference,
         coalesce((o.paid_at at time zone 'Africa/Tunis')::date, tunis_today()) as ev
    into first_sale
    from orders o
   where o.advisor_id = p_recruit and order_is_fully_paid(o)
   order by o.paid_at nulls last, o.created_at
   limit 1;

  if first_sale.id is not null then
    if net > 0 then
      return; -- already awarded
    end if;

    select sponsor_id, prenom, nom into recruit from advisors where user_id = p_recruit;
    sponsor := recruit.sponsor_id;
    if sponsor is null then
      return; -- a founding advisor has nobody to reward
    end if;

    rule := commission_rule_at(advisor_grade_at(sponsor, first_sale.ev), first_sale.ev);
    if coalesce(rule.recruitment_bonus, 0) <= 0 then
      return;
    end if;

    insert into commission_entries
      (advisor_id, period_month, kind, amount, event_date, order_id, recruit_id, label, details, created_by)
    values (
      sponsor,
      commission_period_for(first_sale.ev),
      'recrutement',
      rule.recruitment_bonus,
      first_sale.ev,
      first_sale.id,
      p_recruit,
      'Bonus de recrutement : ' || recruit.prenom || ' ' || recruit.nom,
      jsonb_build_object('reference', first_sale.reference),
      p_actor
    );
    return;
  end if;

  -- No paid sale any more: take back whatever is still standing, from
  -- whoever received it.
  for rec in
    select advisor_id, sum(amount) as total
      from commission_entries
     where recruit_id = p_recruit and kind = 'recrutement'
     group by advisor_id
    having sum(amount) <> 0
  loop
    insert into commission_entries
      (advisor_id, period_month, kind, amount, event_date, recruit_id, label, created_by)
    values (
      rec.advisor_id,
      commission_period_for(tunis_today()),
      'recrutement',
      -rec.total,
      tunis_today(),
      p_recruit,
      'Reprise du bonus de recrutement',
      p_actor
    );
  end loop;
end;
$$;

-- ---------- CLOSING ----------

/**
 * Closes and locks one month (G10–G12). Only a month that is already
 * over can be closed.
 *
 * An advisor whose month nets out negative (clawbacks bigger than gains)
 * isn't paid a negative amount: the balance is carried to the next month
 * as a pair of 'report' lines, so both months still add up.
 */
create or replace function close_commission_period(p_month date, p_actor uuid)
returns void language plpgsql as $$
declare
  next_month date := (p_month + interval '1 month')::date;
  s          text;
  rec        record;
begin
  if extract(day from p_month) <> 1 then
    raise exception 'Mois invalide.';
  end if;
  if p_month >= date_trunc('month', tunis_today())::date then
    raise exception 'periode_en_cours: le mois en cours ne peut pas être clôturé.';
  end if;

  perform pg_advisory_xact_lock(hashtext('commission:periode:' || p_month::text));

  insert into commission_periods (month) values (p_month) on conflict do nothing;
  select status into s from commission_periods where month = p_month;
  if s = 'cloturee' then
    return;
  end if;

  insert into commission_periods (month) values (next_month) on conflict do nothing;

  for rec in
    select advisor_id, sum(amount) as total
      from commission_entries
     where period_month = p_month
     group by advisor_id
    having sum(amount) < 0
  loop
    insert into commission_entries
      (advisor_id, period_month, kind, amount, event_date, label, created_by)
    values
      (rec.advisor_id, p_month, 'report', -rec.total, tunis_today(),
       'Solde négatif reporté sur ' || to_char(next_month, 'MM/YYYY'), p_actor),
      (rec.advisor_id, next_month, 'report', rec.total, tunis_today(),
       'Solde négatif reporté de ' || to_char(p_month, 'MM/YYYY'), p_actor);
  end loop;

  update commission_periods
     set status = 'cloturee', closed_at = now(), closed_by = p_actor
   where month = p_month;
end;
$$;

/**
 * Called daily by the cron. Closes every open month whose payday — the
 * 15th of the following month — has arrived. Running daily rather than
 * only on the 15th means a missed run catches up on its own.
 */
create or replace function close_due_commission_periods()
returns int language plpgsql as $$
declare
  rec    record;
  closed int := 0;
begin
  for rec in
    select month from commission_periods
     where status = 'ouverte'
       and (month + interval '1 month' + interval '14 days')::date <= tunis_today()
     order by month
  loop
    perform close_commission_period(rec.month, null);
    closed := closed + 1;
  end loop;
  return closed;
end;
$$;

-- ---------- ACCESS ----------
-- These functions are reachable through the API like any public
-- function. Only the service role may call them.

revoke all on function tunis_today() from public, anon, authenticated;
revoke all on function commission_period_for(date) from public, anon, authenticated;
revoke all on function advisor_grade_at(uuid, date) from public, anon, authenticated;
revoke all on function commission_rule_at(uuid, date) from public, anon, authenticated;
revoke all on function order_is_fully_paid(orders) from public, anon, authenticated;
revoke all on function reconcile_sale_commission(uuid, uuid) from public, anon, authenticated;
revoke all on function reconcile_recruitment_bonus(uuid, uuid) from public, anon, authenticated;
revoke all on function close_commission_period(date, uuid) from public, anon, authenticated;
revoke all on function close_due_commission_periods() from public, anon, authenticated;

grant execute on function tunis_today() to service_role;
grant execute on function commission_period_for(date) to service_role;
grant execute on function advisor_grade_at(uuid, date) to service_role;
grant execute on function commission_rule_at(uuid, date) to service_role;
grant execute on function order_is_fully_paid(orders) to service_role;
grant execute on function reconcile_sale_commission(uuid, uuid) to service_role;
grant execute on function reconcile_recruitment_bonus(uuid, uuid) to service_role;
grant execute on function close_commission_period(date, uuid) to service_role;
grant execute on function close_due_commission_periods() to service_role;
