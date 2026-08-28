import 'server-only'
import { createAdminClient } from '@/lib/supabase/admin'
import type { DeliveryStatus, PaymentStatus, PaymentMethod } from '@/lib/admin/order-format'
import { DELIVERY_STATUSES, ESTIMATED_DELIVERY_EVENT } from '@/lib/admin/order-format'

const INVOICE_BUCKET = 'order-invoices'

export type { DeliveryStatus, PaymentStatus, PaymentMethod } from '@/lib/admin/order-format'
// Re-exported for server-side convenience only — client components must
// import DELIVERY_STATUSES from '@/lib/admin/order-format' directly, never
// through this module (see the note at the top of that file).
export { DELIVERY_STATUSES, ESTIMATED_DELIVERY_EVENT }

export type AdminOrderListItem = {
  reference: string
  createdAt: string
  prenom: string
  nom: string
  telephone: string
  ville: string
  totalTTC: number
  paymentMethod: PaymentMethod
  status: PaymentStatus
  deliveryStatus: DeliveryStatus
  estimatedDelivery: string | null
}

export type AdminOrderItem = {
  sku: string
  name: string
  quantity: number
  priceHT: number
  priceTTC: number
}

export type AdminOrderHistoryEntry = {
  id: string
  fromStatus: string | null
  toStatus: string
  changedAt: string
  changedByEmail: string | null
}

export type AdminOrderDetail = AdminOrderListItem & {
  email: string | null
  adresse: string
  gouvernorat: string
  deliveryMethod: 'domicile' | 'boutique'
  notes: string | null
  subtotalHT: number
  totalTVA: number
  timbreFiscal: number
  // Storage path of the admin-uploaded invoice PDF, null until one is
  // uploaded. See INVOICE_BUCKET and uploadOrderInvoice() below.
  invoicePath: string | null
  items: AdminOrderItem[]
  history: AdminOrderHistoryEntry[]
}

const LIST_SELECT =
  'reference, created_at, prenom, nom, telephone, ville, total_ttc, payment_method, status, delivery_status, estimated_delivery'

function mapListRow(row: any): AdminOrderListItem {
  return {
    reference: row.reference,
    createdAt: row.created_at,
    prenom: row.prenom,
    nom: row.nom,
    telephone: row.telephone,
    ville: row.ville,
    totalTTC: Number(row.total_ttc),
    paymentMethod: row.payment_method,
    status: row.status,
    deliveryStatus: row.delivery_status,
    estimatedDelivery: row.estimated_delivery ?? null,
  }
}

export async function listOrders(): Promise<AdminOrderListItem[]> {
  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('orders')
    .select(LIST_SELECT)
    .order('created_at', { ascending: false })

  if (error) {
    throw new Error(`Impossible de charger les commandes : ${error.message}`)
  }

  return (data ?? []).map(mapListRow)
}

export async function getOrderDetail(reference: string): Promise<AdminOrderDetail | undefined> {
  const supabase = createAdminClient()

  const { data: order, error } = await supabase
    .from('orders')
    .select(
      `${LIST_SELECT}, id, email, adresse, gouvernorat, delivery_method, notes, subtotal_ht, total_tva, timbre_fiscal, invoice_path,
       order_items ( sku, name, quantity, price_ht, price_ttc )`,
    )
    .eq('reference', reference)
    .maybeSingle()

  if (error) {
    throw new Error(`Impossible de charger la commande ${reference} : ${error.message}`)
  }
  if (!order) return undefined

  const { data: historyRows, error: historyError } = await supabase
    .from('order_status_history')
    .select('id, from_status, to_status, changed_by, changed_at')
    .eq('order_id', order.id)
    .order('changed_at', { ascending: false })

  if (historyError) {
    throw new Error(`Impossible de charger l'historique : ${historyError.message}`)
  }

  const changedByIds = [...new Set((historyRows ?? []).map((h) => h.changed_by).filter(Boolean))]
  let emailByUserId: Record<string, string> = {}

  if (changedByIds.length > 0) {
    const { data: admins } = await supabase
      .from('admin_users')
      .select('user_id, email')
      .in('user_id', changedByIds)
    emailByUserId = Object.fromEntries((admins ?? []).map((a) => [a.user_id, a.email]))
  }

  return {
    ...mapListRow(order),
    email: order.email,
    adresse: order.adresse,
    gouvernorat: order.gouvernorat,
    deliveryMethod: order.delivery_method === 'boutique' ? 'boutique' : 'domicile',
    notes: order.notes,
    subtotalHT: Number(order.subtotal_ht),
    totalTVA: Number(order.total_tva),
    timbreFiscal: Number(order.timbre_fiscal),
    invoicePath: order.invoice_path ?? null,
    items: (order.order_items ?? []).map((item: any) => ({
      sku: item.sku,
      name: item.name,
      quantity: item.quantity,
      priceHT: Number(item.price_ht),
      priceTTC: Number(item.price_ttc),
    })),
    history: (historyRows ?? []).map((h) => ({
      id: h.id,
      fromStatus: h.from_status,
      toStatus: h.to_status,
      changedAt: h.changed_at,
      changedByEmail: h.changed_by ? (emailByUserId[h.changed_by] ?? null) : null,
    })),
  }
}

export async function updateDeliveryStatus(
  reference: string,
  newStatus: DeliveryStatus,
  adminUserId: string,
): Promise<void> {
  const supabase = createAdminClient()

  const { data: order, error: fetchError } = await supabase
    .from('orders')
    .select('id, delivery_status, invoice_path')
    .eq('reference', reference)
    .maybeSingle()

  if (fetchError || !order) {
    throw new Error('Commande introuvable.')
  }

  if (order.delivery_status === newStatus) {
    return
  }

  // The admin-uploaded PDF is what the customer downloads as their
  // invoice (see app/compte/commandes/[reference]/facture) — an order
  // cannot be marked delivered without one already in place.
  if (newStatus === 'livree' && !order.invoice_path) {
    throw new Error(
      'Uploadez la facture PDF de cette commande avant de la marquer comme livrée.',
    )
  }

  // Payment status is derived from delivery, not set by hand. Cash on
  // delivery is the only method that ships today, so the money arrives
  // exactly when the order is handed over: 'livree' means paid, 'annulee'
  // means it never will be. Without this, every order sat at 'en_attente'
  // forever and the admin's payment column was meaningless — there is no
  // other writer for that column now that the provider webhook is gone.
  //
  // When card payment ships, an order paid up front must NOT be reopened
  // by a later delivery change, so this will need to branch on
  // payment_method rather than applying to every order.
  const paymentStatus =
    newStatus === 'livree' ? 'payee' : newStatus === 'annulee' ? 'annulee' : 'en_attente'

  const { error: updateError } = await supabase
    .from('orders')
    .update({ delivery_status: newStatus, status: paymentStatus })
    .eq('id', order.id)

  if (updateError) {
    throw new Error(`Impossible de mettre à jour le statut : ${updateError.message}`)
  }

  const { error: historyError } = await supabase.from('order_status_history').insert({
    order_id: order.id,
    from_status: order.delivery_status,
    to_status: newStatus,
    changed_by: adminUserId,
  })

  if (historyError) {
    throw new Error(`Impossible d'enregistrer l'historique : ${historyError.message}`)
  }

  // Stock leaves the shop when the order is handed over, so the deduction
  // happens on the transition INTO 'livree' and only from a status that
  // was not already 'livree'. The early return above guarantees that:
  // re-selecting the same status never reaches here, so an admin toggling
  // the dropdown cannot deduct twice for one order.
  if (newStatus === 'livree') {
    await decrementStockForOrder(order.id)
  }
}

/**
 * Takes each line's quantity off the corresponding product's stock.
 *
 * Deliberately does NOT throw on failure. The order has already been
 * marked delivered and that is the fact of record; refusing the whole
 * operation because a stock row would go negative would leave the admin
 * unable to close out a real delivery. A shortfall is clamped at zero and
 * the discrepancy is visible in the admin, which is the right place to
 * resolve it.
 */
async function decrementStockForOrder(orderId: string): Promise<void> {
  const supabase = createAdminClient()

  const { data: items, error: itemsError } = await supabase
    .from('order_items')
    .select('sku, quantity')
    .eq('order_id', orderId)

  if (itemsError || !items?.length) return

  for (const item of items) {
    const { data: product } = await supabase
      .from('products')
      .select('id, stock_quantity')
      .eq('sku', item.sku)
      .maybeSingle()

    // The SKU may no longer exist — order_items snapshot the sku at
    // purchase time precisely so history survives a product being removed.
    if (!product) continue

    const next = Math.max(0, (product.stock_quantity ?? 0) - item.quantity)

    await supabase.from('products').update({ stock_quantity: next }).eq('id', product.id)
  }
}

/**
 * Sets (or clears) the free-text delivery estimate on an order.
 *
 * Mirrors updateDeliveryStatus above: service-role client only — `orders`
 * has no anon policies by design — and takes the acting admin's id so the
 * change is attributable, recorded in order_status_history with the
 * ESTIMATED_DELIVERY_EVENT marker rather than a delivery_status value, so
 * the timeline can tell the two kinds of entry apart.
 *
 * An empty or whitespace-only value clears the column back to null rather
 * than storing '', so "unset" has exactly one representation in the DB.
 */
export async function updateEstimatedDelivery(
  reference: string,
  estimatedDelivery: string,
  adminUserId: string,
): Promise<void> {
  const supabase = createAdminClient()

  const trimmed = estimatedDelivery.trim()
  const value = trimmed === '' ? null : trimmed

  const { data: order, error: fetchError } = await supabase
    .from('orders')
    .select('id, estimated_delivery')
    .eq('reference', reference)
    .maybeSingle()

  if (fetchError || !order) {
    throw new Error('Commande introuvable.')
  }

  if ((order.estimated_delivery ?? null) === value) {
    return
  }

  const { error: updateError } = await supabase
    .from('orders')
    .update({ estimated_delivery: value })
    .eq('id', order.id)

  if (updateError) {
    throw new Error(`Impossible de mettre à jour le délai estimé : ${updateError.message}`)
  }

  const { error: historyError } = await supabase.from('order_status_history').insert({
    order_id: order.id,
    from_status: order.estimated_delivery
      ? `${ESTIMATED_DELIVERY_EVENT}:${order.estimated_delivery}`
      : null,
    to_status: value ? `${ESTIMATED_DELIVERY_EVENT}:${value}` : ESTIMATED_DELIVERY_EVENT,
    changed_by: adminUserId,
  })

  if (historyError) {
    throw new Error(`Impossible d'enregistrer l'historique : ${historyError.message}`)
  }
}

/**
 * Uploads (or replaces) the invoice PDF for one order into the private
 * order-invoices bucket, and records its path on the order row. One file
 * per order — reusing the reference as the object path means a re-upload
 * naturally overwrites the previous file (upsert: true) instead of
 * leaving orphaned objects behind.
 */
export async function uploadOrderInvoice(reference: string, file: File): Promise<void> {
  const supabase = createAdminClient()

  const { data: order, error: fetchError } = await supabase
    .from('orders')
    .select('id')
    .eq('reference', reference)
    .maybeSingle()

  if (fetchError || !order) {
    throw new Error('Commande introuvable.')
  }

  const path = `${reference}.pdf`

  const { error: uploadError } = await supabase.storage.from(INVOICE_BUCKET).upload(path, file, {
    contentType: 'application/pdf',
    upsert: true,
  })

  if (uploadError) {
    throw new Error(`Échec de l'envoi de la facture : ${uploadError.message}`)
  }

  const { error: updateError } = await supabase
    .from('orders')
    .update({ invoice_path: path })
    .eq('id', order.id)

  if (updateError) {
    throw new Error(`Impossible d'enregistrer la facture : ${updateError.message}`)
  }
}
