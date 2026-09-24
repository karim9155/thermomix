-- ============================================================
-- INOCASA / Thermomix Tunisie — advisors phase 6: demonstration
-- workshops (ateliers)
-- Run this AFTER 0017_grades_challenges.sql.
-- ============================================================

-- An advisor plans a workshop at a host's home (E1), runs it (E3), then
-- writes a short report (E4). Order forms that come out of it are linked
-- to it (E5), which is what gives the admin a conversion rate from
-- guests to sales (E8).
--
-- status:
--   planifie  planned, still editable (E2)
--   effectue  took place; the report fields are filled in
--   annule    called off, with a reason

create table if not exists workshops (
  id              uuid primary key default gen_random_uuid(),
  advisor_id      uuid not null references advisors(user_id) on delete restrict,
  -- The host is usually one of the advisor's clients; optional so a
  -- workshop can be planned before the host's record exists.
  host_client_id  uuid references clients(id) on delete set null,
  scheduled_at    timestamptz not null,
  location        text not null,
  gouvernorat     text not null,
  invited_count   int not null default 0 check (invited_count >= 0),
  notes           text,
  status          text not null default 'planifie' check (status in ('planifie', 'effectue', 'annule')),
  cancel_reason   text,
  -- Report (E4), filled when the workshop is marked done.
  attendees_count int check (attendees_count is null or attendees_count >= 0),
  contacts_count  int check (contacts_count is null or contacts_count >= 0),
  feedback        text,
  observations    text,
  reported_at     timestamptz,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  constraint workshops_report_check check (
    status <> 'effectue' or (attendees_count is not null and reported_at is not null)
  )
);

create index if not exists workshops_advisor_idx on workshops (advisor_id, scheduled_at desc);
create index if not exists workshops_scheduled_idx on workshops (scheduled_at);

drop trigger if exists workshops_set_updated_at on workshops;
create trigger workshops_set_updated_at
  before update on workshops
  for each row execute function set_updated_at();

alter table workshops enable row level security;
-- Intentionally no policies — service-role only.

-- ---------- ORDER FORMS FROM A WORKSHOP (E5) ----------
-- `set null`: deleting a workshop never touches a sale.

alter table orders
  add column if not exists workshop_id uuid references workshops(id) on delete set null;

create index if not exists orders_workshop_idx on orders (workshop_id);
