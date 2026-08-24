-- ============================================================
-- INOCASA / Thermomix Tunisie — estimated delivery per order
-- Run this AFTER 0004_admin_rls.sql.
-- ============================================================

-- Free text, not a date, on purpose: this is what the admin tells the
-- customer on the phone — "2–3 jours", "Lundi 15", "après le 20" — and
-- forcing it into a date column would lose that. Nothing computes on it;
-- it is displayed verbatim.
--
-- Nullable with no default: an order simply has no estimate until an
-- admin sets one, and the UI renders that absence as "—" rather than
-- inventing a promise the shop hasn't made.

alter table orders
  add column if not exists estimated_delivery text;
