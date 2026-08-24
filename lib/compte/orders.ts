import 'server-only'
import { createClient } from '@/lib/supabase/customer-auth'
import type { DeliveryStatus, PaymentStatus, PaymentMethod } from '@/lib/admin/order-format'

/**
 * Customer-facing order reads.
 *
 * Deliberately NOT using the service-role client the admin side uses:
 * every query here goes through the customer's own session, so migration
 * 0006's select-only RLS policies decide what comes back. Ownership is
 * enforced by the database rather than by a WHERE clause we have to
 * remember to write — a missing filter returns nothing instead of leaking
 * someone else's order.
 */

export type CustomerOrderItem = {
  sku: string
  name: string
  quantity: number
  priceHT: number
  priceTTC: number
}

export type CustomerOrderListItem = {
  reference: string
  createdAt: string
  totalTTC: number
  status: PaymentStatus
  deliveryStatus: DeliveryStatus
  estimatedDelivery: string | null
}

export type CustomerOrderDetail = CustomerOrderListItem & {
  paymentMethod: PaymentMethod
  nom: string
  prenom: string
  telephone: string
  email: string | null
  adresse: string
  ville: string
  gouvernorat: string
  subtotalHT: number
  totalTVA: number
  items: CustomerOrderItem[]
}

const LIST_SELECT =
  'reference, created_at, total_ttc, status, delivery_status, estimated_delivery'

export async function listCustomerOrders(): Promise<CustomerOrderListItem[]> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('orders')
    .select(LIST_SELECT)
    .order('created_at', { ascending: false })

  if (error) {
    throw new Error(`Impossible de charger vos commandes : ${error.message}`)
  }

  return (data ?? []).map((row: any) => ({
    reference: row.reference,
    createdAt: row.created_at,
    totalTTC: Number(row.total_ttc),
    status: row.status,
    deliveryStatus: row.delivery_status,
    estimatedDelivery: row.estimated_delivery ?? null,
  }))
}

/**
 * Returns undefined both when the reference doesn't exist and when it
 * belongs to someone else — RLS filters the row out either way, and the
 * caller renders a 404 for both. That's intentional: distinguishing the
 * two would confirm to a stranger that a given reference is real.
 */
export async function getCustomerOrder(
  reference: string,
): Promise<CustomerOrderDetail | undefined> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('orders')
    .select(
      `${LIST_SELECT}, payment_method, nom, prenom, telephone, email, adresse, ville,
       gouvernorat, subtotal_ht, total_tva,
       order_items ( sku, name, quantity, price_ht, price_ttc )`,
    )
    .eq('reference', reference)
    .maybeSingle()

  if (error) {
    throw new Error(`Impossible de charger la commande : ${error.message}`)
  }
  if (!data) return undefined

  const row = data as any

  return {
    reference: row.reference,
    createdAt: row.created_at,
    totalTTC: Number(row.total_ttc),
    status: row.status,
    deliveryStatus: row.delivery_status,
    estimatedDelivery: row.estimated_delivery ?? null,
    paymentMethod: row.payment_method,
    nom: row.nom,
    prenom: row.prenom,
    telephone: row.telephone,
    email: row.email,
    adresse: row.adresse,
    ville: row.ville,
    gouvernorat: row.gouvernorat,
    subtotalHT: Number(row.subtotal_ht),
    totalTVA: Number(row.total_tva),
    items: (row.order_items ?? []).map((item: any) => ({
      sku: item.sku,
      name: item.name,
      quantity: item.quantity,
      priceHT: Number(item.price_ht),
      priceTTC: Number(item.price_ttc),
    })),
  }
}
