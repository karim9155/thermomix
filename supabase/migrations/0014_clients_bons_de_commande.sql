-- ============================================================
-- INOCASA / Thermomix Tunisie — advisors phase 2: clients,
-- order forms (bons de commande) and instalment schedules
-- Run this AFTER 0013_advisors.sql.
-- ============================================================

-- ---------- CLIENTS ----------
-- An advisor's clients and prospects (domain C). Separate from auth.users:
-- most people an advisor sells to never create a shop account. When one
-- does exist for the same email, user_id links it (use case C4), and the
-- sale then shows up in that customer's /compte.
--
-- A client belongs to exactly one advisor. The phone number is how people
-- are recognised in practice, so it is unique across the whole network
-- (C5): a second advisor entering the same number is told the client is
-- already followed, and only the admin can move them (C7).
--
-- Age is kept as a birth year, so it stays right as years pass; the form
-- asks for an age and converts. It feeds the statistics in phase 7.

create table if not exists clients (
  id              uuid primary key default gen_random_uuid(),
  advisor_id      uuid not null references advisors(user_id) on delete restrict,
  prenom          text not null,
  nom             text not null,
  telephone       text not null,
  -- The last 8 digits of the number, so "+216 22 123 456" and "22123456"
  -- are recognised as the same person. Written by the application.
  telephone_key   text not null,
  email           text,
  adresse         text not null default '',
  ville           text not null default '',
  gouvernorat     text not null,
  annee_naissance int check (annee_naissance between 1900 and 2100),
  sexe            text check (sexe in ('F', 'H')),
  notes           text,
  user_id         uuid references auth.users(id) on delete set null,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create unique index if not exists clients_telephone_key_idx on clients (telephone_key);
create index if not exists clients_advisor_idx on clients (advisor_id);
create index if not exists clients_user_idx on clients (user_id);

drop trigger if exists clients_set_updated_at on clients;
create trigger clients_set_updated_at
  before update on clients
  for each row execute function set_updated_at();

alter table clients enable row level security;
-- Intentionally no policies — service-role only, like orders.

-- ---------- ORDERS: ORDER FORMS ----------
-- An order form IS an order. That keeps the delivery status, stock
-- decrement, invoice upload and the admin order table working for advisor
-- sales without a second copy of any of it.
--
-- source:
--   web         → placed by a customer at checkout (every existing row)
--   conseiller  → an order form entered by an advisor
--
-- sale_status is the order-form lifecycle, and exists only for
-- source = 'conseiller'. It sits beside `status` (payment) and
-- `delivery_status` (fulfilment) and is never merged with them:
--
--   brouillon → a_facturer → facture → partiellement_paye → paye
--                         ↘ (refused: back to brouillon)
--   annule, from any state after brouillon
--
-- `status` is kept in step for advisor sales (payee once fully paid,
-- annulee once cancelled) so the existing payment badge stays truthful.
--
-- advisor_id is also set on web orders attributed through an affiliate
-- link (phase 4), which is why it is not tied to source.

alter table orders
  add column if not exists source text not null default 'web';

alter table orders
  drop constraint if exists orders_source_check;
alter table orders
  add constraint orders_source_check check (source in ('web', 'conseiller'));

alter table orders
  add column if not exists advisor_id uuid references advisors(user_id) on delete restrict,
  add column if not exists client_id uuid references clients(id) on delete restrict,
  add column if not exists sale_status text,
  add column if not exists installment_count int,
  add column if not exists refusal_reason text,
  add column if not exists cancel_reason text,
  add column if not exists submitted_at timestamptz,
  add column if not exists invoiced_at timestamptz,
  add column if not exists paid_at timestamptz,
  add column if not exists cancelled_at timestamptz;

alter table orders
  drop constraint if exists orders_sale_status_check;
alter table orders
  add constraint orders_sale_status_check check (
    sale_status is null or sale_status in
      ('brouillon', 'a_facturer', 'facture', 'partiellement_paye', 'paye', 'annule')
  );

alter table orders
  drop constraint if exists orders_installment_count_check;
alter table orders
  add constraint orders_installment_count_check check (
    installment_count is null or installment_count between 1 and 5
  );

-- An order form always knows its advisor, its client and its stage; a web
-- order never has an order-form stage.
alter table orders
  drop constraint if exists orders_order_form_shape_check;
alter table orders
  add constraint orders_order_form_shape_check check (
    (source = 'web' and sale_status is null)
    or (source = 'conseiller'
        and sale_status is not null
        and advisor_id is not null
        and client_id is not null
        and installment_count is not null)
  );

-- Advisor sales are paid in cash or by instalments, collected by the shop.
alter table orders
  drop constraint if exists orders_payment_method_check;
alter table orders
  add constraint orders_payment_method_check
  check (payment_method in ('livraison', 'en_ligne', 'comptant', 'echelonne'));

create index if not exists orders_advisor_idx     on orders (advisor_id);
create index if not exists orders_client_idx      on orders (client_id);
create index if not exists orders_sale_status_idx on orders (sale_status);

-- ---------- INSTALMENTS ----------
-- The payment schedule of an invoiced order form (D7): one row per
-- instalment, a single row for a cash sale. Generated when the admin
-- issues the invoice; each row is marked paid when the money is collected
-- (D11). "Late" is not stored — it is an unpaid row whose due date has
-- passed, worked out when read, so no nightly job can fall behind.

create table if not exists order_installments (
  id             uuid primary key default gen_random_uuid(),
  order_id       uuid not null references orders(id) on delete cascade,
  number         int not null check (number between 1 and 5),
  amount         numeric(10,3) not null check (amount > 0),
  due_date       date not null,
  paid_at        date,
  payment_method text check (payment_method in ('especes', 'cheque', 'virement', 'carte')),
  payment_note   text,
  recorded_by    uuid references auth.users(id) on delete set null,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  unique (order_id, number)
);

create index if not exists order_installments_order_idx on order_installments (order_id);
create index if not exists order_installments_due_idx
  on order_installments (due_date) where paid_at is null;

drop trigger if exists order_installments_set_updated_at on order_installments;
create trigger order_installments_set_updated_at
  before update on order_installments
  for each row execute function set_updated_at();

alter table order_installments enable row level security;
-- Intentionally no policies — service-role only.
