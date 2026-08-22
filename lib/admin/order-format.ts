// Client-safe order status types/constants — no server-only imports, so
// client components (status dropdown, filter tabs) can use these without
// dragging lib/admin/orders.ts's service-role client into the browser
// bundle, the same way lib/product-format.ts is split from lib/products.ts.

export type DeliveryStatus = 'en_preparation' | 'en_cours_de_livraison' | 'livree' | 'annulee'
export type PaymentStatus = 'en_attente' | 'payee' | 'annulee'
export type PaymentMethod = 'livraison' | 'en_ligne'

export const DELIVERY_STATUSES: DeliveryStatus[] = [
  'en_preparation',
  'en_cours_de_livraison',
  'livree',
  'annulee',
]
