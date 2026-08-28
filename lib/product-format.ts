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
  /** Units on hand. Decremented when an order is marked delivered. */
  stockQuantity: number
  isFeatured: boolean
  sortOrder: number
}

// Fiscal stamp duty charged on cash-on-delivery orders, in TND. It is a
// flat fee added at payment time — never part of a product's price.
export const TIMBRE_FISCAL = 1

// Home-delivery fees in TND, by product category. Charged once per order,
// not per item: one order is one shipment. Store pickup is always free.
export const DELIVERY_FEE_ROBOT = 25
export const DELIVERY_FEE_ACCESSOIRE = 10

/**
 * Home-delivery fee for a cart, in TND.
 *
 * One shipment, one fee, at the highest rate any item in the cart calls
 * for: a cart containing a robot ships at the robot rate no matter how
 * many accessories ride along with it. Quantities do not multiply it.
 *
 * Returns 0 for an empty cart and for in-store pickup (callers pass
 * deliveryMethod), so the row simply disappears rather than showing "0".
 */
export function calculateDeliveryFee(
  // category is optional because cart items saved before it was stored
  // hydrate without it (see CartItem). A missing category is treated as an
  // accessory, matching the backfill in lib/cart-context.tsx.
  items: { category?: ProductCategory }[],
  deliveryMethod: 'domicile' | 'boutique',
): number {
  if (deliveryMethod !== 'domicile' || items.length === 0) return 0

  return items.some((item) => item.category === 'robot')
    ? DELIVERY_FEE_ROBOT
    : DELIVERY_FEE_ACCESSOIRE
}

/**
 * The boutique's official pickup address, used both to fill an order's
 * address fields when the customer chooses in-store pickup over home
 * delivery, and to display the address wherever that choice needs
 * explaining (checkout, confirmation, order emails).
 */
export const BOUTIQUE_ADDRESS = {
  adresse: 'RDC, Immeuble Villa Jade, commerce N°3, Avenue du Stade',
  ville: 'La Marsa',
  codePostal: '2070',
  gouvernorat: 'Tunis',
}

export const BOUTIQUE_ADDRESS_LABEL =
  `${BOUTIQUE_ADDRESS.adresse}, ${BOUTIQUE_ADDRESS.codePostal} ${BOUTIQUE_ADDRESS.ville}, Tunisie`

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

/**
 * Same thousands separator as formatPrice, but keeping two decimals.
 *
 * TTC prices are round dinars by design (5 799, 689, 249...), so formatPrice
 * rounding them is lossless. The HT half of the same price is not: 5 799
 * TTC is 4 873,109 HT, and rounding that to "4 873" makes a column of HT
 * line items visibly fail to add up to the HT subtotal beneath it. Line
 * items shown HT therefore use this instead.
 *
 * Comma as the decimal mark, matching fr-TN and the rest of the UI.
 */
export function formatPriceHT(price: number): string {
  const [whole, decimals] = price.toFixed(2).split('.')
  const spaced = whole.replace(/\B(?=(\d{3})+(?!\d))/g, ' ')
  return `${spaced},${decimals} TND`
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
