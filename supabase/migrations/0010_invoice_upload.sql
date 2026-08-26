-- ============================================================
-- INOCASA / Thermomix Tunisie — admin-uploaded invoice PDF
-- Run this AFTER 0009_timbre_fiscal.sql.
-- ============================================================

-- Path of the admin-uploaded invoice PDF inside the private
-- 'order-invoices' bucket, e.g. 'INO-AB12CD.pdf'. Null until the admin
-- uploads one, at which point it replaces the auto-generated PDF as what
-- the customer downloads from /compte.
alter table orders
  add column if not exists invoice_path text;

-- Private bucket: unlike product-images, invoices are per-customer
-- financial documents and are never served directly from a public URL —
-- always read through a server route that re-checks ownership. No
-- storage.objects policies are added here, matching orders' own
-- no-anon-policy posture (see 0001_catalog.sql): only createAdminClient()
-- (service role) can read or write these files.
insert into storage.buckets (id, name, public)
values ('order-invoices', 'order-invoices', false)
on conflict (id) do nothing;
