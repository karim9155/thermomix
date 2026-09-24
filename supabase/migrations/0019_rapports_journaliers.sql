-- ============================================================
-- INOCASA / Thermomix Tunisie — advisors phase 7: daily reports
-- Run this AFTER 0018_ateliers.sql.
-- ============================================================

-- The daily activity report (J2) is GENERATED from the activity log —
-- what the advisor did that day is already recorded there, so nobody
-- types it twice. The only thing stored here is the advisor's own
-- optional comment on the day.

create table if not exists advisor_daily_reports (
  advisor_id  uuid not null references advisors(user_id) on delete cascade,
  day         date not null,
  comment     text not null check (char_length(comment) <= 2000),
  updated_at  timestamptz not null default now(),
  primary key (advisor_id, day)
);

drop trigger if exists advisor_daily_reports_set_updated_at on advisor_daily_reports;
create trigger advisor_daily_reports_set_updated_at
  before update on advisor_daily_reports
  for each row execute function set_updated_at();

alter table advisor_daily_reports enable row level security;
-- Intentionally no policies — service-role only.
