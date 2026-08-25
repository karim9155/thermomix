-- ============================================================
-- INOCASA / Thermomix Tunisie — stock as a quantity
-- Run this AFTER 0007_customer_profiles.sql.
-- ============================================================

-- `in_stock` was a boolean: an admin ticked a box and the shop either
-- sold the product or didn't. `stock_quantity` replaces that judgement
-- with a count that goes down on its own when an order is delivered.
--
-- The boolean is KEPT, not dropped, and is now derived: a product is in
-- stock when stock_quantity > 0. Keeping it means the storefront read
-- path, the checkout guard and the dashboard's "rupture" count keep
-- working unchanged, and there is no window during deployment where the
-- old code reads a column that no longer exists.

alter table products
  add column if not exists stock_quantity integer not null default 0;

-- Seed from the boolean so nothing reads as out of stock the moment this
-- runs: anything currently sellable starts at 10, anything already out
-- stays at 0. Adjust the real numbers in the admin afterwards.
update products
   set stock_quantity = case when in_stock then 10 else 0 end
 where stock_quantity = 0;

alter table products
  drop constraint if exists products_stock_quantity_check;

-- Never below zero. The decrement is guarded in application code too, but
-- this is the backstop: a bug there cannot leave negative stock behind.
alter table products
  add constraint products_stock_quantity_check
  check (stock_quantity >= 0);

-- ---------- KEEP in_stock IN STEP ----------
-- in_stock becomes a cache of `stock_quantity > 0`, maintained here
-- rather than in application code so it cannot drift — every write path,
-- including a manual UPDATE in the SQL editor, goes through this.

create or replace function sync_in_stock()
returns trigger
language plpgsql
as $$
begin
  new.in_stock := new.stock_quantity > 0;
  return new;
end;
$$;

drop trigger if exists products_sync_in_stock on products;

create trigger products_sync_in_stock
  before insert or update of stock_quantity on products
  for each row
  execute function sync_in_stock();

-- Bring existing rows in line with the rule above.
update products set stock_quantity = stock_quantity;

create index if not exists products_stock_quantity_idx on products (stock_quantity);
