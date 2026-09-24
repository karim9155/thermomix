-- ============================================================
-- INOCASA / Thermomix Tunisie — advisors (conseillers), phase 1
-- Run this AFTER 0012_delivery_fee.sql.
-- ============================================================

-- A third protected area, /conseiller, next to /admin-r and /compte.
-- Same auth.users table as both: an advisor is an auth.users row WITH a
-- matching `advisors` row, exactly the way an admin is one with an
-- `admin_users` row. See proxy.ts and lib/conseiller/guard.ts.
--
-- Every table here follows the orders posture: RLS on, and no policies
-- except the one self-read the guard needs. All reads and writes go
-- through the service-role client after a guard has confirmed who is
-- asking.

-- ---------- GRADES ----------
-- A table, not an enum: the admin will add, rename and archive grades,
-- and each one will carry its own criteria and bonus amounts (phases 3
-- and 5). `rank` orders them, lowest first; a new advisor starts on the
-- lowest active grade unless the admin picks another.

create table if not exists grades (
  id          uuid primary key default gen_random_uuid(),
  name        text not null unique,
  rank        int  not null unique,
  description text,
  is_archived boolean not null default false,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

drop trigger if exists grades_set_updated_at on grades;
create trigger grades_set_updated_at
  before update on grades
  for each row execute function set_updated_at();

alter table grades enable row level security;

-- The two starting grades. Rename them here or later in the admin.
insert into grades (name, rank, description) values
  ('Conseiller', 1, 'Grade de départ.'),
  ('Chef d''équipe', 2, 'Deuxième grade.')
on conflict (name) do nothing;

-- ---------- ADVISORS ----------
-- Keyed by auth.users id, so a row IS the advisor for that account.
--
-- status:
--   invite    → account created, invitation sent, password not set yet
--   actif     → can use /conseiller
--   suspendu  → blocked on the very next request (the guard re-reads it)
--
-- sponsor_id is the upline (parrain). NULL means a founding advisor
-- created directly by the admin. The tree has no depth limit; the only
-- rule is that it stays a tree, which the trigger below enforces.
--
-- `on delete restrict` on sponsor_id: deleting an advisor who still has
-- recruits would silently turn them into founders. Reassign first.

create table if not exists advisors (
  user_id               uuid primary key references auth.users(id) on delete cascade,
  email                 text not null,
  prenom                text not null,
  nom                   text not null,
  telephone             text not null,
  region                text not null,
  grade_id              uuid not null references grades(id),
  sponsor_id            uuid references advisors(user_id) on delete restrict,
  status                text not null default 'invite'
                        check (status in ('invite', 'actif', 'suspendu')),
  -- Generated at creation (use case I1). Links go live in phase 4; the
  -- column and its switch exist now so the code never changes shape.
  affiliate_code        text not null unique,
  affiliate_code_active boolean not null default true,
  invited_at            timestamptz,
  activated_at          timestamptz,
  suspended_at          timestamptz,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now(),
  constraint advisors_not_own_sponsor check (sponsor_id is null or sponsor_id <> user_id)
);

create index if not exists advisors_sponsor_idx on advisors (sponsor_id);
create index if not exists advisors_status_idx  on advisors (status);
create unique index if not exists advisors_email_idx on advisors (lower(email));

drop trigger if exists advisors_set_updated_at on advisors;
create trigger advisors_set_updated_at
  before update on advisors
  for each row execute function set_updated_at();

-- No cycles (use case B8). Moving an advisor under one of their own
-- recruits would detach a whole branch from the tree. Walk up from the
-- new sponsor: if we meet the advisor being moved, refuse.
--
-- Checked in the database, not only in the app, because moving a branch
-- is exactly the kind of write two admins can race on.

create or replace function advisors_prevent_cycle()
returns trigger language plpgsql as $$
begin
  if new.sponsor_id is null then
    return new;
  end if;

  if exists (
    with recursive up as (
      select user_id, sponsor_id from advisors where user_id = new.sponsor_id
      union all
      select a.user_id, a.sponsor_id
        from advisors a
        join up on a.user_id = up.sponsor_id
    )
    select 1 from up where user_id = new.user_id
  ) then
    raise exception 'advisor_cycle: un conseiller ne peut pas être rattaché à sa propre sous-branche.';
  end if;

  return new;
end;
$$;

drop trigger if exists advisors_prevent_cycle on advisors;
create trigger advisors_prevent_cycle
  before insert or update of sponsor_id on advisors
  for each row execute function advisors_prevent_cycle();

alter table advisors enable row level security;

-- The one policy: an advisor may read their OWN row through the cookie
-- session, so proxy.ts and the guard can answer "is this an advisor, and
-- are they active?" without the service-role client. Same idea as
-- migration 0004's admin_users self-check. No write policies.

drop policy if exists "advisor reads own row" on advisors;

create policy "advisor reads own row"
  on advisors for select
  to authenticated
  using (auth.uid() = user_id);

-- ---------- GRADE HISTORY ----------
-- Every grade an advisor has held, with the date it took effect (F8).
-- Bonus amounts will be read from the grade in force on the date of a
-- sale, so this history is what makes past payslips reproducible.

create table if not exists advisor_grade_history (
  id            uuid primary key default gen_random_uuid(),
  advisor_id    uuid not null references advisors(user_id) on delete cascade,
  from_grade_id uuid references grades(id),
  to_grade_id   uuid not null references grades(id),
  reason        text,
  changed_by    uuid references auth.users(id) on delete set null,
  effective_at  timestamptz not null default now()
);

create index if not exists advisor_grade_history_advisor_idx
  on advisor_grade_history (advisor_id, effective_at desc);

alter table advisor_grade_history enable row level security;

-- ---------- RECRUIT APPLICATIONS ----------
-- An advisor proposes a recruit (B3); the admin accepts or refuses (B4).
-- Accepting creates the advisor account with the applicant's sponsor
-- already set (B5), and records which account it became.

create table if not exists advisor_applications (
  id              uuid primary key default gen_random_uuid(),
  sponsor_id      uuid not null references advisors(user_id) on delete cascade,
  prenom          text not null,
  nom             text not null,
  telephone       text not null,
  email           text not null,
  region          text not null,
  notes           text,
  status          text not null default 'en_attente'
                  check (status in ('en_attente', 'acceptee', 'refusee')),
  decision_reason text,
  decided_by      uuid references auth.users(id) on delete set null,
  decided_at      timestamptz,
  advisor_id      uuid references advisors(user_id) on delete set null,
  created_at      timestamptz not null default now()
);

create index if not exists advisor_applications_status_idx
  on advisor_applications (status, created_at desc);
create index if not exists advisor_applications_sponsor_idx
  on advisor_applications (sponsor_id);

alter table advisor_applications enable row level security;

-- ---------- ACTIVITY LOG ----------
-- Every advisor action, and every admin action on an advisor (J8).
-- Built now so no later phase has to retrofit it.
--
-- advisor_id is the advisor the entry is ABOUT (for their activity feed),
-- actor_id is who did it — the same person for an advisor's own action,
-- the admin for an admin action. Deliberately not a foreign key: the log
-- must outlive whatever it describes.
--
-- Append-only. The trigger refuses UPDATE and DELETE even for the
-- service role, so a bug elsewhere cannot rewrite history.

create table if not exists activity_log (
  id          bigint generated always as identity primary key,
  actor_id    uuid,
  actor_role  text not null check (actor_role in ('conseiller', 'admin', 'systeme')),
  advisor_id  uuid,
  action      text not null,
  entity_type text,
  entity_id   text,
  details     jsonb not null default '{}'::jsonb,
  created_at  timestamptz not null default now()
);

create index if not exists activity_log_advisor_idx on activity_log (advisor_id, created_at desc);
create index if not exists activity_log_created_idx on activity_log (created_at desc);

create or replace function activity_log_append_only()
returns trigger language plpgsql as $$
begin
  raise exception 'activity_log est en ajout seul.';
end;
$$;

drop trigger if exists activity_log_append_only on activity_log;
create trigger activity_log_append_only
  before update or delete on activity_log
  for each row execute function activity_log_append_only();

alter table activity_log enable row level security;

-- ---------- LOOKUP: AUTH USER BY EMAIL ----------
-- Creating an advisor whose email already has an account (a customer
-- who becomes an advisor) must link that account, not fail. The auth
-- admin API has no lookup by email, so this does it, service role only.

create or replace function auth_user_id_by_email(p_email text)
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select id from auth.users where lower(email) = lower(p_email) limit 1
$$;

revoke all on function auth_user_id_by_email(text) from public, anon, authenticated;
grant execute on function auth_user_id_by_email(text) to service_role;
