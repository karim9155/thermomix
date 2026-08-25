-- ============================================================
-- INOCASA / Thermomix Tunisie — customer profiles
-- Run this AFTER 0006_customer_accounts.sql.
-- ============================================================

-- Delivery details a customer can maintain themselves, so checkout can be
-- prefilled before they have ever ordered and editing them doesn't touch
-- order history. Orders keep their own copy of the address by design:
-- they are a record of where something was actually sent, and must not
-- change when the customer later moves.
--
-- Keyed by auth.users id, so a row IS the profile for that account.

create table if not exists profiles (
  user_id     uuid primary key references auth.users(id) on delete cascade,
  prenom      text not null default '',
  nom         text not null default '',
  telephone   text not null default '',
  adresse     text not null default '',
  ville       text not null default '',
  gouvernorat text not null default '',
  updated_at  timestamptz not null default now()
);

alter table profiles enable row level security;

-- ---------- RLS ----------
-- Unlike orders, this table IS customer-writable — but only ever the
-- caller's own row, and only these three verbs. No delete: a profile goes
-- away with its auth.users row via the cascade above, never by itself.
--
-- `with check` on insert/update is what stops someone writing a row for
-- another user_id; `using` alone would only restrict which rows they can
-- see to modify, not what they may write into them.

drop policy if exists "customer reads own profile" on profiles;

create policy "customer reads own profile"
  on profiles for select
  to authenticated
  using (auth.uid() = user_id);

drop policy if exists "customer creates own profile" on profiles;

create policy "customer creates own profile"
  on profiles for insert
  to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "customer updates own profile" on profiles;

create policy "customer updates own profile"
  on profiles for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
