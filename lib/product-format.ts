// Pure, client-safe product types and formatting helpers.
//
// This file must never import anything server-only (Supabase, next/headers,
// etc.) — it's imported directly by client components so that they don't
// drag lib/products.ts's Supabase/next-headers dependency chain into the
// browser bundle just to use formatPrice() or the Product type.

export type ProductCategory = 'robot' | 'accessoire'

export type ProductImage = {
  url: string
  alt: string | null
  position: number
}

export type Product = {
  sku: string
  slug: string
  name: string
  category: ProductCategory
  priceHT: number
  tva: number
  priceTTC: number
  shortDescription: string
  description: string
  features: string[]
  included?: string[]
  image: string
  images: ProductImage[]
  sourceUrl: string
  inStock: boolean
  isFeatured: boolean
  sortOrder: number
}

export const PLACEHOLDER_IMAGE = '/placeholder.svg'

// next/image blocks SVG optimization by default (XSS surface) — the local
// placeholder needs to opt out of the optimizer per-instance rather than
// disabling that protection globally.
export function isPlaceholderImage(src: string): boolean {
  return src === PLACEHOLDER_IMAGE
}

export function formatPrice(price: number): string {
  return `${Math.round(price)
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, ' ')} TND`
}

export const governorates = [
  'Ariana',
  'Béja',
  'Ben Arous',
  'Bizerte',
  'Gabès',
  'Gafsa',
  'Jendouba',
  'Kairouan',
  'Kasserine',
  'Kébili',
  'Kef',
  'Mahdia',
  'Manouba',
  'Médenine',
  'Monastir',
  'Nabeul',
  'Sfax',
  'Sidi Bouzid',
  'Siliana',
  'Sousse',
  'Tataouine',
  'Tozeur',
  'Tunis',
  'Zaghouan',
]
