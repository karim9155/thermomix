-- ============================================================
-- INOCASA / Thermomix Tunisie — advisors: matricule
-- Run this AFTER 0019_rapports_journaliers.sql.
-- ============================================================

-- An 8-digit number the admin chooses when creating an advisor, unique
-- across the network and never changed afterwards — it is the reference
-- the shop uses outside this app (paperwork, payouts), so it has to stay
-- stable even when the advisor's name or email does.
--
-- Stored as text, not an integer: it is an identifier rather than a
-- quantity, nothing ever adds to it, and text is what keeps a leading
-- zero ('00412233') from being read back as 412233.

alter table advisors
  add column if not exists matricule text;

-- Existing advisors predate the column, so they are numbered from
-- 10000001 in the order they were created. These are placeholders: the
-- admin can tell them apart and replace them, which is why the column is
-- only made NOT NULL after this runs.
with numbered as (
  select user_id,
         10000000 + row_number() over (order by created_at, user_id) as assigned
    from advisors
   where matricule is null
)
update advisors
   set matricule = numbered.assigned::text
  from numbered
 where advisors.user_id = numbered.user_id;

alter table advisors
  alter column matricule set not null;

alter table advisors
  drop constraint if exists advisors_matricule_format_check;
alter table advisors
  add constraint advisors_matricule_format_check
  check (matricule ~ '^[0-9]{8}$');

create unique index if not exists advisors_matricule_idx on advisors (matricule);
