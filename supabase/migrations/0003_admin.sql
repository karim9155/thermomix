-- ============================================================
-- INOCASA / Thermomix Tunisie — admin dashboard schema
-- Run this AFTER 0001_catalog.sql and 0002_seed.sql.
-- ============================================================

-- ---------- ADMIN USERS ----------
-- A user is an admin if and only if their auth.users id has a row here.
-- RLS is enabled with NO policies at all — same posture as orders /
-- order_items below: this table is reachable only through the
-- service-role client (lib/supabase/admin.ts), never through the
-- anon/publishable key, authenticated or not.

create table if not exists admin_users (
  user_id    uuid primary key references auth.users(id) on delete cascade,
  email      text not null,
  created_at timestamptz not null default now()
);

alter table admin_users enable row level security;

-- Intentionally no policies.

-- ---------- ORDERS: DELIVERY STATUS ----------
-- `status` (existing, unchanged) tracks PAYMENT state:
--   en_attente / payee / annulee
-- `delivery_status` tracks FULFILLMENT state and is a separate concept —
-- an order can be `payee` and still `en_preparation`, or `en_attente`
-- (cash on delivery) and already `en_cours_de_livraison`. Never merge them.

alter table orders
  add column if not exists delivery_status text not null default 'en_preparation';

alter table orders
  drop constraint if exists orders_delivery_status_check;

alter table orders
  add constraint orders_delivery_status_check
  check (delivery_status in ('en_preparation', 'en_cours_de_livraison', 'livree', 'annulee'));

create index if not exists orders_delivery_status_idx on orders (delivery_status);
create index if not exists orders_created_at_idx      on orders (created_at desc);

-- ---------- PRODUCTS: ARCHIVING ----------
-- Archived products are hidden from the public storefront but keep their
-- row. order_items already snapshot name/price at purchase time, so past
-- orders are unaffected either way.

alter table products
  add column if not exists is_archived boolean not null default false;

create index if not exists products_is_archived_idx on products (is_archived);

-- ---------- ORDER STATUS HISTORY ----------

create table if not exists order_status_history (
  id          uuid primary key default gen_random_uuid(),
  order_id    uuid not null references orders(id) on delete cascade,
  from_status text,
  to_status   text not null,
  changed_by  uuid references auth.users(id) on delete set null,
  changed_at  timestamptz not null default now()
);

create index if not exists order_status_history_order_idx on order_status_history (order_id);

alter table order_status_history enable row level security;

-- Intentionally no policies — service-role only, same posture as orders.
