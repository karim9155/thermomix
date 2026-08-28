import { createClient } from '@/lib/supabase/server'
import { PLACEHOLDER_IMAGE, type Product, type ProductCategory } from '@/lib/product-format'

export type { Product, ProductCategory, ProductImage } from '@/lib/product-format'

type ProductRow = {
  sku: string
  slug: string
  name: string
  category: string
  price_ht: number
  tva: number
  price_ttc: number
  short_description: string | null
  description: string | null
  features: string[] | null
  included: string[] | null
  source_url: string | null
  in_stock: boolean
  stock_quantity: number | null
  is_featured: boolean
  sort_order: number
  product_images: { url: string; alt: string | null; position: number }[] | null
}

const PRODUCT_SELECT = `
  sku, slug, name, category, price_ht, tva, price_ttc,
  short_description, description, features, included,
  source_url, in_stock, stock_quantity, is_featured, sort_order,
  product_images ( url, alt, position )
`

function mapRow(row: ProductRow): Product {
  const images = (row.product_images ?? []).slice().sort((a, b) => a.position - b.position)

  return {
    sku: row.sku,
    slug: row.slug,
    name: row.name,
    category: row.category as ProductCategory,
    priceHT: Number(row.price_ht),
    tva: Number(row.tva),
    priceTTC: Number(row.price_ttc),
    shortDescription: row.short_description ?? '',
    description: row.description ?? '',
    features: row.features ?? [],
    included: row.included && row.included.length > 0 ? row.included : undefined,
    image: images[0]?.url ?? PLACEHOLDER_IMAGE,
    images,
    sourceUrl: row.source_url ?? '',
    inStock: row.in_stock,
    stockQuantity: row.stock_quantity ?? 0,
    isFeatured: row.is_featured,
    sortOrder: row.sort_order,
  }
}

// All four queries below serve the PUBLIC storefront and therefore always
// exclude archived products. Admin queries live in lib/admin/products.ts
// and intentionally include them.

export async function getAllProducts(): Promise<Product[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('products')
    .select(PRODUCT_SELECT)
    .eq('is_archived', false)
    .order('sort_order', { ascending: true })

  if (error) {
    throw new Error(`Impossible de charger le catalogue : ${error.message}`)
  }

  return (data ?? []).map((row) => mapRow(row as unknown as ProductRow))
}

export async function getProductBySlug(slug: string): Promise<Product | undefined> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('products')
    .select(PRODUCT_SELECT)
    .eq('slug', slug)
    .eq('is_archived', false)
    .maybeSingle()

  if (error) {
    throw new Error(`Impossible de charger le produit « ${slug} » : ${error.message}`)
  }

  return data ? mapRow(data as unknown as ProductRow) : undefined
}

/**
 * Batch SKU lookup for checkout, which has to validate every line of the
 * cart. One `in` query instead of one round-trip per item — a five-item
 * cart was five sequential queries before the order could be created,
 * which the customer felt as a stalled submit button.
 *
 * Returned as a Map keyed by SKU so the caller keeps validating in cart
 * order and reports the same "Produit inconnu" for a missing SKU. Applies
 * the same is_archived filter as getProductBySku below, so an archived
 * SKU is absent from the map and reads as unknown — matching that
 * function's undefined for the same row.
 */
export async function getProductsBySkus(skus: string[]): Promise<Map<string, Product>> {
  if (skus.length === 0) return new Map()

  const supabase = await createClient()
  const { data, error } = await supabase
    .from('products')
    .select(PRODUCT_SELECT)
    .in('sku', [...new Set(skus)])
    .eq('is_archived', false)

  if (error) {
    throw new Error(`Impossible de charger les produits de la commande : ${error.message}`)
  }

  const products = (data ?? []).map((row) => mapRow(row as unknown as ProductRow))
  return new Map(products.map((product) => [product.sku, product]))
}

export async function getProductBySku(sku: string): Promise<Product | undefined> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('products')
    .select(PRODUCT_SELECT)
    .eq('sku', sku)
    .eq('is_archived', false)
    .maybeSingle()

  if (error) {
    throw new Error(`Impossible de charger le produit Réf. ${sku} : ${error.message}`)
  }

  return data ? mapRow(data as unknown as ProductRow) : undefined
}

export async function getProductsByCategory(category: ProductCategory): Promise<Product[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('products')
    .select(PRODUCT_SELECT)
    .eq('category', category)
    .eq('is_archived', false)
    .order('sort_order', { ascending: true })

  if (error) {
    throw new Error(`Impossible de charger la catégorie « ${category} » : ${error.message}`)
  }

  return (data ?? []).map((row) => mapRow(row as unknown as ProductRow))
}

export async function getFeaturedProducts(): Promise<Product[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('products')
    .select(PRODUCT_SELECT)
    .eq('is_featured', true)
    .eq('is_archived', false)
    .order('sort_order', { ascending: true })

  if (error) {
    throw new Error(`Impossible de charger les produits mis en avant : ${error.message}`)
  }

  return (data ?? []).map((row) => mapRow(row as unknown as ProductRow))
}
