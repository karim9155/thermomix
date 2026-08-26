-- ============================================================
-- INOCASA / Thermomix Tunisie — timbre fiscal on cash orders
-- Run this AFTER 0008_stock_quantity.sql.
-- ============================================================

-- The 1 TND fiscal stamp charged on cash-on-delivery orders. It is never
-- part of a product's price (subtotal_ht / total_tva / total_ttc stay pure
-- product figures) — it is added on top only at payment time, so it gets
-- its own column rather than being folded into total_ttc.
--
-- Existing rows default to 0: they were charged before this fee existed
-- and are not retroactively amended.
alter table orders
  add column if not exists timbre_fiscal numeric(10,3) not null default 0;
