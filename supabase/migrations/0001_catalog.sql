-- ============================================================
-- INOCASA / Thermomix Tunisie — boutique schema
-- Run this FIRST in the Supabase SQL editor.
-- ============================================================

-- ---------- CATALOG ----------

create table if not exists products (
  id                uuid primary key default gen_random_uuid(),
  sku               text not null unique,            -- the Réf. number
  slug              text not null unique,
  name              text not null,
  category          text not null check (category in ('robot','accessoire')),
  price_ht          numeric(10,3) not null,
  tva               numeric(4,2)  not null default 0.19,
  price_ttc         numeric(10,2) not null,
  short_description text,
  description       text,
  features          text[] not null default '{}',
  included          text[] not null default '{}',
  source_url        text,
  in_stock          boolean not null default true,
  is_featured       boolean not null default false,
  sort_order        int not null default 0,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

create table if not exists product_images (
  id         uuid primary key default gen_random_uuid(),
  product_id uuid not null references products(id) on delete cascade,
  url        text not null,
  alt        text,
  position   int  not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists product_images_product_position_idx
  on product_images (product_id, position);
create index if not exists products_category_idx on products (category);
create index if not exists products_sort_idx     on products (sort_order);

-- Keep updated_at honest
create or replace function set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists products_set_updated_at on products;
create trigger products_set_updated_at
  before update on products
  for each row execute function set_updated_at();

-- ---------- ORDERS ----------

create table if not exists orders (
  id             uuid primary key default gen_random_uuid(),
  reference      text not null unique,              -- INO-XXXXXX
  nom            text not null,
  prenom         text not null,
  telephone      text not null,
  email          text,
  adresse        text not null,
  ville          text not null,
  gouvernorat    text not null,
  notes          text,
  payment_method text not null check (payment_method in ('livraison','en_ligne')),
  status         text not null default 'en_attente'
                 check (status in ('en_attente','payee','annulee')),
  subtotal_ht    numeric(10,3) not null,
  total_tva      numeric(10,3) not null,
  total_ttc      numeric(10,2) not null,
  created_at     timestamptz not null default now()
);

create table if not exists order_items (
  id        uuid primary key default gen_random_uuid(),
  order_id  uuid not null references orders(id) on delete cascade,
  sku       text not null,
  name      text not null,                          -- snapshot at purchase time
  price_ht  numeric(10,3) not null,
  price_ttc numeric(10,2) not null,
  quantity  int not null check (quantity > 0)
);

create index if not exists order_items_order_idx on order_items (order_id);
create index if not exists orders_reference_idx  on orders (reference);

-- ---------- ROW LEVEL SECURITY ----------
-- The publishable key ships to the browser. Catalog is public read.
-- Orders have NO anon policies — they are reachable only via the secret key
-- in server-side route handlers.

alter table products       enable row level security;
alter table product_images enable row level security;
alter table orders         enable row level security;
alter table order_items    enable row level security;

drop policy if exists "public read products" on products;
create policy "public read products"
  on products for select
  to anon, authenticated
  using (true);

drop policy if exists "public read product_images" on product_images;
create policy "public read product_images"
  on product_images for select
  to anon, authenticated
  using (true);

-- Intentionally no policies on orders / order_items.

-- ---------- STORAGE ----------
-- Public bucket for product photos.

insert into storage.buckets (id, name, public)
values ('product-images', 'product-images', true)
on conflict (id) do nothing;

drop policy if exists "public read product images" on storage.objects;
create policy "public read product images"
  on storage.objects for select
  to anon, authenticated
  using (bucket_id = 'product-images');
