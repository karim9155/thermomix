-- ============================================================
-- Attach uploaded product photos to their products by SKU.
--
-- Prerequisite: upload files into the public "product-images" bucket
-- using one folder per SKU, e.g.
--   product-images/63151/main.jpg
--   product-images/63151/side.jpg
--   product-images/77352/main.jpg
--
-- Run this AFTER uploading. Safe to re-run — it only inserts files
-- that aren't already attached, so uploading more photos later and
-- re-running just adds the new ones.
--
-- Ordering: within a product, a file named "main*" (case-insensitive)
-- gets position 0; everything else is ordered alphabetically after it.
-- ============================================================

with candidates as (
  select
    p.id as product_id,
    o.name as object_path,
    split_part(o.name, '/', 2) as file_name,
    row_number() over (
      partition by p.id
      order by
        case when split_part(o.name, '/', 2) ilike 'main%' then 0 else 1 end,
        split_part(o.name, '/', 2)
    ) - 1 as position
  from storage.objects o
  join products p on p.sku = split_part(o.name, '/', 1)
  where o.bucket_id = 'product-images'
    and split_part(o.name, '/', 2) <> ''   -- skip the folder placeholder itself
)
insert into product_images (product_id, url, alt, position)
select
  c.product_id,
  'https://aayubxjoyvqcyxzoshrx.supabase.co/storage/v1/object/public/product-images/' || c.object_path,
  null,
  c.position
from candidates c
where not exists (
  select 1
  from product_images pi
  where pi.product_id = c.product_id
    and pi.url = 'https://aayubxjoyvqcyxzoshrx.supabase.co/storage/v1/object/public/product-images/' || c.object_path
);

-- Sanity check: run this after to see what got attached.
-- select p.sku, p.name, pi.position, pi.url
-- from product_images pi join products p on p.id = pi.product_id
-- order by p.sort_order, pi.position;
