import 'server-only'
import { createAdminClient } from '@/lib/supabase/admin'
import type { CheckoutFormValues } from '@/lib/checkout-schema'

export type OrderStatus = 'en_attente' | 'payee' | 'annulee'
export type OrderPaymentMethod = 'cash' | 'online'

export type OrderLine = {
  sku: string
  name: string
  quantity: number
  priceHT: number
  priceTTC: number
}

export type Order = {
  reference: string
  customer: CheckoutFormValues
  items: OrderLine[]
  subtotalHT: number
  totalTVA: number
  totalTTC: number
  // Fiscal stamp fee added at payment time, on top of totalTTC. Not part
  // of the product price — see lib/product-format.ts's TIMBRE_FISCAL.
  timbreFiscal: number
  paymentMethod: OrderPaymentMethod
  status: OrderStatus
  createdAt: string
}

// The DB check constraint uses French terms; the rest of the app (checkout
// form, payment adapter) uses 'cash' | 'online'. Translate at the boundary
// so nothing else needs to know about the DB's vocabulary.
const PAYMENT_METHOD_TO_DB: Record<OrderPaymentMethod, string> = {
  cash: 'livraison',
  online: 'en_ligne',
}

const PAYMENT_METHOD_FROM_DB: Record<string, OrderPaymentMethod> = {
  livraison: 'cash',
  en_ligne: 'online',
}

function generateReference(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
  let suffix = ''
  for (let i = 0; i < 6; i++) {
    suffix += chars[Math.floor(Math.random() * chars.length)]
  }
  return `INO-${suffix}`
}

type OrderRow = {
  reference: string
  nom: string
  prenom: string
  telephone: string
  email: string | null
  adresse: string
  ville: string
  gouvernorat: string
  notes: string | null
  payment_method: string
  delivery_method: string
  status: OrderStatus
  subtotal_ht: number
  total_tva: number
  total_ttc: number
  timbre_fiscal: number
  created_at: string
  order_items: {
    sku: string
    name: string
    quantity: number
    price_ht: number
    price_ttc: number
  }[]
}

const ORDER_SELECT = `
  reference, nom, prenom, telephone, email, adresse, ville, gouvernorat, notes,
  payment_method, delivery_method, status, subtotal_ht, total_tva, total_ttc, timbre_fiscal,
  created_at,
  order_items ( sku, name, quantity, price_ht, price_ttc )
`

function mapRow(row: OrderRow): Order {
  const paymentMethod = PAYMENT_METHOD_FROM_DB[row.payment_method] ?? 'cash'

  return {
    reference: row.reference,
    customer: {
      nom: row.nom,
      prenom: row.prenom,
      telephone: row.telephone,
      email: row.email ?? '',
      adresse: row.adresse,
      ville: row.ville,
      gouvernorat: row.gouvernorat,
      notes: row.notes ?? '',
      deliveryMethod: row.delivery_method === 'boutique' ? 'boutique' : 'domicile',
      paymentMethod,
    },
    items: (row.order_items ?? []).map((item) => ({
      sku: item.sku,
      name: item.name,
      quantity: item.quantity,
      priceHT: Number(item.price_ht),
      priceTTC: Number(item.price_ttc),
    })),
    subtotalHT: Number(row.subtotal_ht),
    totalTVA: Number(row.total_tva),
    totalTTC: Number(row.total_ttc),
    timbreFiscal: Number(row.timbre_fiscal),
    paymentMethod,
    status: row.status,
    createdAt: row.created_at,
  }
}

export async function createOrder(input: {
  customer: CheckoutFormValues
  items: OrderLine[]
  subtotalHT: number
  totalTVA: number
  totalTTC: number
  timbreFiscal: number
  paymentMethod: OrderPaymentMethod
  // The owning auth.users id, resolved from the session server-side by the
  // caller. Required for new orders; the column stays nullable only so
  // pre-account guest orders survive (see migration 0006).
  userId: string
}): Promise<Order> {
  const supabase = createAdminClient()

  let lastError: string | undefined

  for (let attempt = 0; attempt < 5; attempt++) {
    const reference = generateReference()

    const { data: inserted, error: orderError } = await supabase
      .from('orders')
      .insert({
        reference,
        nom: input.customer.nom,
        prenom: input.customer.prenom,
        telephone: input.customer.telephone,
        email: input.customer.email || null,
        adresse: input.customer.adresse,
        ville: input.customer.ville,
        gouvernorat: input.customer.gouvernorat,
        notes: input.customer.notes || null,
        payment_method: PAYMENT_METHOD_TO_DB[input.paymentMethod],
        delivery_method: input.customer.deliveryMethod,
        status: 'en_attente',
        subtotal_ht: input.subtotalHT,
        total_tva: input.totalTVA,
        total_ttc: input.totalTTC,
        timbre_fiscal: input.timbreFiscal,
        user_id: input.userId,
      })
      .select('id, reference, created_at')
      .single()

    if (orderError) {
      if (orderError.code === '23505') {
        // reference collision on the unique constraint — try a fresh one
        lastError = orderError.message
        continue
      }
      throw new Error(`Impossible de créer la commande : ${orderError.message}`)
    }

    const { error: itemsError } = await supabase.from('order_items').insert(
      input.items.map((item) => ({
        order_id: inserted.id,
        sku: item.sku,
        name: item.name,
        price_ht: item.priceHT,
        price_ttc: item.priceTTC,
        quantity: item.quantity,
      })),
    )

    if (itemsError) {
      // Don't leave an order header with no lines behind.
      await supabase.from('orders').delete().eq('id', inserted.id)
      throw new Error(
        `Impossible d'enregistrer les articles de la commande : ${itemsError.message}`,
      )
    }

    return {
      reference: inserted.reference,
      customer: input.customer,
      items: input.items,
      subtotalHT: input.subtotalHT,
      totalTVA: input.totalTVA,
      totalTTC: input.totalTTC,
      timbreFiscal: input.timbreFiscal,
      paymentMethod: input.paymentMethod,
      status: 'en_attente',
      createdAt: inserted.created_at,
    }
  }

  throw new Error(
    `Impossible de générer une référence de commande unique : ${lastError ?? 'raison inconnue'}`,
  )
}

export async function getOrder(reference: string): Promise<Order | undefined> {
  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('orders')
    .select(ORDER_SELECT)
    .eq('reference', reference)
    .maybeSingle()

  if (error) {
    throw new Error(`Impossible de charger la commande ${reference} : ${error.message}`)
  }

  return data ? mapRow(data as unknown as OrderRow) : undefined
}

export async function updateOrderStatus(
  reference: string,
  status: OrderStatus,
): Promise<Order | undefined> {
  const supabase = createAdminClient()
  const { error } = await supabase.from('orders').update({ status }).eq('reference', reference)

  if (error) {
    throw new Error(`Impossible de mettre à jour la commande ${reference} : ${error.message}`)
  }

  return getOrder(reference)
}
