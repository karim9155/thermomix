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

/**
 * Marks an order_status_history row as a delivery-estimate change rather
 * than a delivery_status transition. Rows are stored as either the bare
 * marker (estimate cleared) or `${ESTIMATED_DELIVERY_EVENT}:<free text>`.
 * Kept here, not in lib/admin/orders.ts, so the timeline renderer can
 * import it without pulling the service-role client into its bundle.
 */
export const ESTIMATED_DELIVERY_EVENT = 'estimation_livraison'

export function parseEstimatedDeliveryEvent(status: string): string | null {
  if (status === ESTIMATED_DELIVERY_EVENT) return ''
  if (status.startsWith(`${ESTIMATED_DELIVERY_EVENT}:`)) {
    return status.slice(ESTIMATED_DELIVERY_EVENT.length + 1)
  }
  return null
}

/**
 * Renders a delivery estimate for display.
 *
 * The column is free text on purpose (see migration 0005) — an admin may
 * write "2–3 jours", "Lundi 15" or just "7". Only the bare-number case
 * needs a unit appended; appending unconditionally would produce
 * "2-3 jours jours". Anything that already contains a letter is passed
 * through untouched.
 */
export function formatEstimatedDelivery(value: string | null | undefined): string | null {
  if (!value) return null

  const trimmed = value.trim()
  if (trimmed === '') return null

  // A plain count of days: "7", "10". Ranges written with digits only
  // ("2-3", "2–3") get the unit too, since they read as days as well.
  if (/^\d+(\s*[-–]\s*\d+)?$/.test(trimmed)) {
    const isOne = trimmed === '1'
    return `${trimmed} ${isOne ? 'jour' : 'jours'}`
  }

  return trimmed
}
