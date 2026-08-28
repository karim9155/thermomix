-- ============================================================
-- INOCASA / Thermomix Tunisie — home-delivery fee
-- Run this AFTER 0011_delivery_method.sql.
-- ============================================================

-- Flat shipping fee charged on "livraison à domicile" orders, in TND.
-- Like timbre_fiscal it sits OUTSIDE the product figures: subtotal_ht,
-- total_tva and total_ttc stay pure product totals, and this is added on
-- top at payment time, so it gets its own column rather than being folded
-- into total_ttc.
--
-- The rate depends on what is being shipped — see calculateDeliveryFee()
-- in lib/product-format.ts, which is the single source of truth:
--   robot in the cart  -> 25 TND
--   accessories only   -> 10 TND
--   pickup in store    ->  0 TND
-- It is charged once per order, not per item: one order is one shipment.
--
-- Existing rows default to 0: they were placed before this fee existed and
-- are not retroactively amended.
alter table orders
  add column if not exists delivery_fee numeric(10,3) not null default 0;
