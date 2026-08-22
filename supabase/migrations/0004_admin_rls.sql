-- ============================================================
-- INOCASA / Thermomix Tunisie — admin_users self-check policy
-- Run this AFTER 0003_admin.sql.
-- ============================================================

-- Lets a logged-in user check whether THEY are an admin (their own row
-- only) via the cookie-based session client, so middleware doesn't need
-- the service-role client just to answer "am I an admin?" on every
-- request. No insert/update/delete policies — admin membership is
-- managed by hand in the SQL editor.

drop policy if exists "admin can read own row" on admin_users;

create policy "admin can read own row"
  on admin_users for select
  to authenticated
  using (auth.uid() = user_id);
