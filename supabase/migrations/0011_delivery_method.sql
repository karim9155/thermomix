-- ============================================================
-- INOCASA / Thermomix Tunisie — home delivery vs in-store pickup
-- Run this AFTER 0010_invoice_upload.sql.
-- ============================================================

-- Existing orders were all home deliveries — the only option before this
-- migration — so they default to 'domicile' rather than needing a backfill
-- decision.
alter table orders
  add column if not exists delivery_method text not null default 'domicile';

alter table orders
  drop constraint if exists orders_delivery_method_check;

alter table orders
  add constraint orders_delivery_method_check
  check (delivery_method in ('domicile', 'boutique'));
