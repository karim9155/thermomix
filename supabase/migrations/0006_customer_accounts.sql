-- ============================================================
-- INOCASA / Thermomix Tunisie — customer accounts
-- Run this AFTER 0005_estimated_delivery.sql.
-- ============================================================

-- ---------- ORDERS: OWNER ----------
-- Links an order to the Supabase Auth user who placed it. Same auth
-- system as the admin login (auth.users) — customers are simply
-- auth.users rows WITHOUT a matching admin_users row, so being a
-- customer never implies admin access. See proxy.ts, where the two
-- checks stay separate.
--
-- Deliberately NULLABLE. Checkout requires an account from now on
-- (app/api/commande/route.ts rejects a sessionless order), but orders
-- placed before that rule existed have no user to point at. Making the
-- column NOT NULL would mean deleting or forging an owner for real
-- historical sales, so instead: new orders always carry a user_id, old
-- guest orders keep working in the admin, and they simply never appear
-- under any customer's /compte.

alter table orders
  add column if not exists user_id uuid references auth.users(id);

create index if not exists orders_user_idx on orders (user_id);

-- ---------- CUSTOMER READ ACCESS ----------
-- SELECT ONLY, and scoped to the caller's own rows.
--
-- Customers must never insert or update orders directly: order creation
-- stays server-side in app/api/commande/route.ts, which validates prices
-- and stock against the catalog before writing through the service-role
-- client. A customer-writable orders table would let the browser dictate
-- its own totals.
--
-- These are the first policies on orders/order_items. Note what that
-- means for the `anon` role: it is still granted nothing at all, so the
-- publishable key in the browser sees zero orders, exactly as before.
-- Only an authenticated session can read, and only its own rows.

drop policy if exists "customer reads own orders" on orders;

create policy "customer reads own orders"
  on orders for select
  to authenticated
  using (auth.uid() = user_id);

drop policy if exists "customer reads own order items" on order_items;

create policy "customer reads own order items"
  on order_items for select
  to authenticated
  using (exists (
    select 1 from orders o
    where o.id = order_items.order_id and o.user_id = auth.uid()
  ));
