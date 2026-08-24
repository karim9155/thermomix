import 'server-only'
import { createAdminClient } from '@/lib/supabase/admin'
import type { DeliveryStatus, PaymentStatus, PaymentMethod } from '@/lib/admin/order-format'
import { DELIVERY_STATUSES, ESTIMATED_DELIVERY_EVENT } from '@/lib/admin/order-format'

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
  notes: string | null
  subtotalHT: number
  totalTVA: number
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
      `${LIST_SELECT}, id, email, adresse, gouvernorat, notes, subtotal_ht, total_tva,
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
    notes: order.notes,
    subtotalHT: Number(order.subtotal_ht),
    totalTVA: Number(order.total_tva),
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
    .select('id, delivery_status')
    .eq('reference', reference)
    .maybeSingle()

  if (fetchError || !order) {
    throw new Error('Commande introuvable.')
  }

  if (order.delivery_status === newStatus) {
    return
  }

  const { error: updateError } = await supabase
    .from('orders')
    .update({ delivery_status: newStatus })
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
