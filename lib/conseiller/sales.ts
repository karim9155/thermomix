import 'server-only'
import { createAdminClient } from '@/lib/supabase/admin'
import { fetchAll } from '@/lib/supabase/fetch-all'
import { getProductsBySkus } from '@/lib/products'
import { logActivity, type ActorRole } from '@/lib/conseiller/activity'
import { getClient } from '@/lib/conseiller/clients'
import { reconcileSaleCommission } from '@/lib/conseiller/remuneration'
import { assertWorkshopOwner } from '@/lib/conseiller/workshops'
import {
  BOUTIQUE_ADDRESS,
  TIMBRE_FISCAL,
  calculateDeliveryFee,
  type ProductCategory,
} from '@/lib/product-format'
import type {
  Installment,
  InstallmentPaymentMethod,
  OrderFormValues,
  SaleDetail,
  SaleLine,
  SaleListItem,
  SaleStatus,
} from '@/lib/conseiller/format'

// Order forms (bons de commande), domain D.
//
// An order form is an `orders` row with source = 'conseiller' (see
// migration 0014). Everything here goes through the service-role client,
// so:
//   - advisor-side functions take the advisor id FROM THE GUARD and only
//     ever touch that advisor's rows;
//   - every state change is a conditional update on the expected current
//     state, so two admins (or an admin and an advisor) acting at once
//     can't both win — the loser gets "already processed".

type Actor = { id: string; role: ActorRole }

// ---------- DATES ----------
// The business runs on Tunis time. The server doesn't (Vercel is UTC), so
// "today" is computed for Africa/Tunis explicitly — otherwise an
// instalment due today would turn late an hour early, or a day late.

export function todayInTunis(): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Africa/Tunis' }).format(new Date())
}

/** Same day N months later, clamped to the month's end (31 Jan → 28 Feb). */
function addMonths(isoDate: string, months: number): string {
  const [year, month, day] = isoDate.split('-').map(Number)
  const target = new Date(Date.UTC(year, month - 1 + months, 1))
  const lastDay = new Date(
    Date.UTC(target.getUTCFullYear(), target.getUTCMonth() + 1, 0),
  ).getUTCDate()
  target.setUTCDate(Math.min(day, lastDay))
  return target.toISOString().slice(0, 10)
}

// ---------- SCHEDULE ----------

/**
 * Splits the amount due into `count` monthly instalments (D7), the first
 * one due on the invoice date.
 *
 * Instalments are whole dinars and the first one absorbs the remainder:
 * 5 825 TND over 3 gives 1 943 + 1 941 + 1 941. Working in millimes keeps
 * the sum exact — the rows always add up to the total, to the millime.
 */
export function buildSchedule(
  totalDue: number,
  count: number,
  startDate: string,
): { number: number; amount: number; due_date: string }[] {
  const totalMillimes = Math.round(totalDue * 1000)
  let base = Math.floor(totalMillimes / count / 1000) * 1000
  if (base === 0) base = Math.floor(totalMillimes / count)
  const first = totalMillimes - base * (count - 1)

  return Array.from({ length: count }, (_, index) => ({
    number: index + 1,
    amount: (index === 0 ? first : base) / 1000,
    due_date: addMonths(startDate, index),
  }))
}

// ---------- PRICING ----------

type PricedForm = {
  lines: SaleLine[]
  categories: { category: ProductCategory }[]
  subtotalHT: number
  totalTVA: number
  totalTTC: number
}

/**
 * Prices an order form from the live catalog (D2). The browser sends only
 * SKUs and quantities; a price it sends would simply be ignored.
 *
 * Stock is checked when the form is submitted and again when it is
 * invoiced, not on every draft save: a draft is a work in progress, and
 * refusing to save it because stock ran low would lose the advisor's work.
 */
async function priceItems(
  items: { sku: string; quantity: number }[],
  options: { checkStock: boolean },
): Promise<PricedForm> {
  // One line per SKU: two lines of the same product become one.
  const quantities = new Map<string, number>()
  for (const item of items) {
    quantities.set(item.sku, (quantities.get(item.sku) ?? 0) + item.quantity)
  }

  const products = await getProductsBySkus([...quantities.keys()])
  const lines: SaleLine[] = []
  const categories: { category: ProductCategory }[] = []

  for (const [sku, quantity] of quantities) {
    const product = products.get(sku)
    if (!product) throw new Error(`Produit indisponible : Réf. ${sku}.`)

    if (options.checkStock && quantity > product.stockQuantity) {
      throw new Error(
        product.stockQuantity === 0
          ? `${product.name} est en rupture de stock.`
          : `Il ne reste que ${product.stockQuantity} unité(s) de ${product.name}.`,
      )
    }

    lines.push({
      sku: product.sku,
      name: product.name,
      quantity,
      priceHT: product.priceHT,
      priceTTC: product.priceTTC,
    })
    categories.push({ category: product.category })
  }

  const subtotalHT = lines.reduce((sum, line) => sum + line.priceHT * line.quantity, 0)
  const totalTTC = lines.reduce((sum, line) => sum + line.priceTTC * line.quantity, 0)

  return { lines, categories, subtotalHT, totalTTC, totalTVA: totalTTC - subtotalHT }
}

// ---------- READS ----------

type SaleRow = {
  id: string
  reference: string
  sale_status: SaleStatus
  advisor_id: string
  client_id: string
  installment_count: number
  delivery_method: string
  delivery_status: string
  workshop_id: string | null
  notes: string | null
  refusal_reason: string | null
  cancel_reason: string | null
  subtotal_ht: number
  total_tva: number
  total_ttc: number
  timbre_fiscal: number
  delivery_fee: number
  created_at: string
  submitted_at: string | null
  invoiced_at: string | null
  paid_at: string | null
  cancelled_at: string | null
  client: {
    id: string
    prenom: string
    nom: string
    telephone: string
    email: string | null
    adresse: string
    ville: string
    gouvernorat: string
    user_id: string | null
  } | null
  advisor: { prenom: string; nom: string } | null
  order_items: { sku: string; name: string; quantity: number; price_ht: number; price_ttc: number }[]
  order_installments: {
    id: string
    number: number
    amount: number
    due_date: string
    paid_at: string | null
    payment_method: InstallmentPaymentMethod | null
    payment_note: string | null
  }[]
}

const SALE_SELECT = `
  id, reference, sale_status, advisor_id, client_id, installment_count,
  delivery_method, delivery_status, workshop_id, notes, refusal_reason, cancel_reason,
  subtotal_ht, total_tva, total_ttc, timbre_fiscal, delivery_fee,
  created_at, submitted_at, invoiced_at, paid_at, cancelled_at,
  client:clients!orders_client_id_fkey ( id, prenom, nom, telephone, email, adresse, ville, gouvernorat, user_id ),
  advisor:advisors!orders_advisor_id_fkey ( prenom, nom ),
  order_items ( sku, name, quantity, price_ht, price_ttc ),
  order_installments ( id, number, amount, due_date, paid_at, payment_method, payment_note )
`

function mapInstallments(row: SaleRow, today: string): Installment[] {
  return (row.order_installments ?? [])
    .slice()
    .sort((a, b) => a.number - b.number)
    .map((entry) => ({
      id: entry.id,
      number: entry.number,
      amount: Number(entry.amount),
      dueDate: entry.due_date,
      paidAt: entry.paid_at,
      paymentMethod: entry.payment_method,
      paymentNote: entry.payment_note,
      // A cancelled sale has nothing late: nobody is chasing that money.
      isLate: !entry.paid_at && entry.due_date < today && row.sale_status !== 'annule',
    }))
}

function totalDueOf(row: Pick<SaleRow, 'total_ttc' | 'timbre_fiscal' | 'delivery_fee'>): number {
  return Number(row.total_ttc) + Number(row.timbre_fiscal) + Number(row.delivery_fee ?? 0)
}

function mapListItem(row: SaleRow, today: string): SaleListItem {
  const installments = mapInstallments(row, today)
  return {
    reference: row.reference,
    saleStatus: row.sale_status,
    clientId: row.client_id,
    clientName: row.client ? `${row.client.prenom} ${row.client.nom}` : '—',
    advisorId: row.advisor_id,
    advisorName: row.advisor ? `${row.advisor.prenom} ${row.advisor.nom}` : '—',
    totalDue: totalDueOf(row),
    paidAmount: installments
      .filter((entry) => entry.paidAt)
      .reduce((sum, entry) => sum + entry.amount, 0),
    installmentCount: row.installment_count,
    hasLateInstallment: installments.some((entry) => entry.isLate),
    createdAt: row.created_at,
    submittedAt: row.submitted_at,
    invoicedAt: row.invoiced_at,
  }
}

/**
 * Order forms, newest first. With advisorId, only that advisor's (drafts
 * included); without, the admin's view, which never shows drafts — a
 * draft is the advisor's private work until it is submitted.
 */
export async function listSales(
  options: { advisorId?: string; clientId?: string; workshopId?: string } = {},
): Promise<SaleListItem[]> {
  const supabase = createAdminClient()

  const data = await fetchAll((from, to) => {
    let query = supabase
      .from('orders')
      .select(SALE_SELECT)
      .eq('source', 'conseiller')
      .order('created_at', { ascending: false })
      .order('id')

    if (options.advisorId) {
      query = query.eq('advisor_id', options.advisorId)
    } else {
      query = query.neq('sale_status', 'brouillon')
    }
    if (options.clientId) query = query.eq('client_id', options.clientId)
    if (options.workshopId) query = query.eq('workshop_id', options.workshopId)
    return query.range(from, to)
  }).catch((error: Error) => {
    throw new Error(`Impossible de charger les bons de commande : ${error.message}`)
  })

  const today = todayInTunis()
  return (data as unknown as SaleRow[]).map((row) => mapListItem(row, today))
}

/**
 * One order form. With advisorId, undefined unless it is that advisor's.
 * Without (admin), undefined for a draft, for the same reason listSales
 * hides them.
 */
export async function getSale(
  reference: string,
  options: { advisorId?: string } = {},
): Promise<SaleDetail | undefined> {
  const supabase = createAdminClient()

  let query = supabase
    .from('orders')
    .select(SALE_SELECT)
    .eq('source', 'conseiller')
    .eq('reference', reference)

  if (options.advisorId) {
    query = query.eq('advisor_id', options.advisorId)
  } else {
    query = query.neq('sale_status', 'brouillon')
  }

  const { data, error } = await query.maybeSingle()
  if (error) throw new Error(`Impossible de charger le bon de commande : ${error.message}`)
  if (!data) return undefined

  const row = data as unknown as SaleRow
  const today = todayInTunis()

  return {
    ...mapListItem(row, today),
    id: row.id,
    workshopId: row.workshop_id,
    deliveryMethod: row.delivery_method === 'boutique' ? 'boutique' : 'domicile',
    deliveryStatus: row.delivery_status,
    notes: row.notes,
    refusalReason: row.refusal_reason,
    cancelReason: row.cancel_reason,
    subtotalHT: Number(row.subtotal_ht),
    totalTVA: Number(row.total_tva),
    totalTTC: Number(row.total_ttc),
    timbreFiscal: Number(row.timbre_fiscal),
    deliveryFee: Number(row.delivery_fee ?? 0),
    paidAt: row.paid_at,
    cancelledAt: row.cancelled_at,
    client: {
      id: row.client?.id ?? row.client_id,
      prenom: row.client?.prenom ?? '',
      nom: row.client?.nom ?? '',
      telephone: row.client?.telephone ?? '',
      email: row.client?.email ?? null,
      adresse: row.client?.adresse ?? '',
      ville: row.client?.ville ?? '',
      gouvernorat: row.client?.gouvernorat ?? '',
      hasAccount: Boolean(row.client?.user_id),
    },
    items: (row.order_items ?? []).map((item) => ({
      sku: item.sku,
      name: item.name,
      quantity: item.quantity,
      priceHT: Number(item.price_ht),
      priceTTC: Number(item.price_ttc),
    })),
    installments: mapInstallments(row, today),
  }
}

// ---------- ADVISOR: DRAFTS AND SUBMISSION ----------

function generateReference(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let suffix = ''
  for (let i = 0; i < 6; i++) suffix += chars[Math.floor(Math.random() * chars.length)]
  return `BC-${suffix}`
}

/**
 * Creates or updates a draft (D1, D3, D4), and with `submit` sends it to
 * the admin (D5): brouillon → a_facturer, after which it can no longer
 * be edited.
 *
 * The address is the client's for home delivery and the shop's for
 * pickup — copied onto the order like at checkout, because an order is a
 * record of where something was actually sent.
 *
 * Fees (delivery, fiscal stamp) are left at 0: the admin decides them
 * when issuing the invoice.
 */
export async function saveDraft(
  advisorId: string,
  reference: string | null,
  values: OrderFormValues,
  submit: boolean,
): Promise<string> {
  const client = await getClient(values.clientId, { advisorId })
  if (!client) throw new Error('Client introuvable.')

  if (values.deliveryMethod === 'domicile' && (!client.adresse || !client.ville)) {
    throw new Error(
      "L'adresse du client est incomplète : complétez sa fiche pour une livraison à domicile.",
    )
  }

  if (values.workshopId) await assertWorkshopOwner(advisorId, values.workshopId)

  const priced = await priceItems(values.items, { checkStock: submit })
  const address =
    values.deliveryMethod === 'boutique'
      ? {
          adresse: BOUTIQUE_ADDRESS.adresse,
          ville: BOUTIQUE_ADDRESS.ville,
          gouvernorat: BOUTIQUE_ADDRESS.gouvernorat,
        }
      : { adresse: client.adresse, ville: client.ville, gouvernorat: client.gouvernorat }

  const header = {
    client_id: client.id,
    nom: client.nom,
    prenom: client.prenom,
    telephone: client.telephone,
    email: client.email,
    ...address,
    delivery_method: values.deliveryMethod,
    workshop_id: values.workshopId || null,
    notes: values.notes || null,
    installment_count: values.installmentCount,
    payment_method: values.installmentCount > 1 ? 'echelonne' : 'comptant',
    subtotal_ht: priced.subtotalHT,
    total_tva: priced.totalTVA,
    total_ttc: priced.totalTTC,
    ...(submit
      ? { sale_status: 'a_facturer', submitted_at: new Date().toISOString(), refusal_reason: null }
      : {}),
  }

  const supabase = createAdminClient()
  let orderId: string
  let orderReference: string

  if (reference) {
    const { data, error } = await supabase
      .from('orders')
      .update(header)
      .eq('reference', reference)
      .eq('advisor_id', advisorId)
      .eq('sale_status', 'brouillon')
      .select('id, reference')

    if (error) throw new Error(error.message)
    if (!data || data.length === 0) {
      throw new Error("Ce bon de commande n'est plus un brouillon : il ne peut plus être modifié.")
    }
    orderId = data[0].id
    orderReference = data[0].reference

    const { error: deleteError } = await supabase.from('order_items').delete().eq('order_id', orderId)
    if (deleteError) throw new Error(deleteError.message)
  } else {
    let inserted: { id: string; reference: string } | null = null
    let lastError: string | undefined

    for (let attempt = 0; attempt < 5 && !inserted; attempt++) {
      const { data, error } = await supabase
        .from('orders')
        .insert({
          ...header,
          reference: generateReference(),
          source: 'conseiller',
          advisor_id: advisorId,
          sale_status: submit ? 'a_facturer' : 'brouillon',
          status: 'en_attente',
          timbre_fiscal: 0,
          delivery_fee: 0,
        })
        .select('id, reference')
        .single()

      if (!error) inserted = data
      else if (error.code === '23505') lastError = error.message
      else throw new Error(error.message)
    }

    if (!inserted) throw new Error(lastError ?? 'Impossible de créer le bon de commande.')
    orderId = inserted.id
    orderReference = inserted.reference
  }

  const { error: itemsError } = await supabase.from('order_items').insert(
    priced.lines.map((line) => ({
      order_id: orderId,
      sku: line.sku,
      name: line.name,
      price_ht: line.priceHT,
      price_ttc: line.priceTTC,
      quantity: line.quantity,
    })),
  )

  if (itemsError) {
    // A new order with no lines is worthless; an existing draft keeps its
    // header and can simply be saved again.
    if (!reference) await supabase.from('orders').delete().eq('id', orderId)
    throw new Error(`Impossible d'enregistrer les produits : ${itemsError.message}`)
  }

  await logActivity({
    actorId: advisorId,
    actorRole: 'conseiller',
    advisorId,
    action: submit ? 'vente.soumise' : reference ? 'vente.brouillon_modifie' : 'vente.brouillon_cree',
    entityType: 'order',
    entityId: orderReference,
    details: { client: `${client.prenom} ${client.nom}`, totalTTC: priced.totalTTC },
  })

  return orderReference
}

export async function deleteDraft(advisorId: string, reference: string): Promise<void> {
  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('orders')
    .delete()
    .eq('reference', reference)
    .eq('advisor_id', advisorId)
    .eq('sale_status', 'brouillon')
    .select('id')

  if (error) throw new Error(error.message)
  if (!data || data.length === 0) {
    throw new Error("Ce bon de commande n'est plus un brouillon : il ne peut plus être supprimé.")
  }

  await logActivity({
    actorId: advisorId,
    actorRole: 'conseiller',
    advisorId,
    action: 'vente.brouillon_supprime',
    entityType: 'order',
    entityId: reference,
  })
}

// ---------- ADMIN: VALIDATION ----------

async function getSaleHeader(reference: string) {
  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('orders')
    .select(
      'id, reference, sale_status, advisor_id, client_id, installment_count, delivery_method, delivery_status, total_ttc, timbre_fiscal, delivery_fee',
    )
    .eq('source', 'conseiller')
    .eq('reference', reference)
    .maybeSingle()

  if (error) throw new Error(error.message)
  if (!data) throw new Error('Bon de commande introuvable.')
  return data as {
    id: string
    reference: string
    sale_status: SaleStatus
    advisor_id: string
    client_id: string
    installment_count: number
    delivery_method: 'domicile' | 'boutique'
    delivery_status: string
    total_ttc: number
    timbre_fiscal: number
    delivery_fee: number
  }
}

const ALREADY_PROCESSED = 'Ce bon de commande a déjà été traité entre-temps. Rechargez la page.'

/**
 * Validates the order form and issues the invoice (D9, D10):
 * a_facturer → facture. The admin decides here whether the delivery fee
 * and the fiscal stamp apply to this sale; the schedule is generated from
 * the resulting total (D7).
 *
 * If the client has a shop account, the order is attached to it, which
 * is what makes it appear in their /compte (existing RLS on orders).
 */
export async function invoiceSale(
  reference: string,
  fees: { applyDeliveryFee: boolean; applyTimbre: boolean },
  actor: Actor,
): Promise<void> {
  const sale = await getSaleHeader(reference)
  if (sale.sale_status !== 'a_facturer') throw new Error(ALREADY_PROCESSED)

  const supabase = createAdminClient()
  const { data: items } = await supabase
    .from('order_items')
    .select('sku, quantity')
    .eq('order_id', sale.id)

  // Stock again: time has passed since submission.
  const priced = await priceItems(items ?? [], { checkStock: true })

  const deliveryFee = fees.applyDeliveryFee
    ? calculateDeliveryFee(priced.categories, sale.delivery_method)
    : 0
  const timbreFiscal = fees.applyTimbre ? TIMBRE_FISCAL : 0
  const totalDue = Number(sale.total_ttc) + deliveryFee + timbreFiscal

  const today = todayInTunis()

  const clientUserId = await clientAccountId(sale.client_id)

  // Claim first, schedule second. The conditional update is the lock: of
  // two admins invoicing at the same moment exactly one gets the row, and
  // only that one writes the schedule. (The reverse order let the loser's
  // clean-up delete the winner's schedule.)
  const { data, error } = await supabase
    .from('orders')
    .update({
      sale_status: 'facture',
      invoiced_at: new Date().toISOString(),
      delivery_fee: deliveryFee,
      timbre_fiscal: timbreFiscal,
      ...(clientUserId ? { user_id: clientUserId } : {}),
    })
    .eq('id', sale.id)
    .eq('sale_status', 'a_facturer')
    .select('id')

  if (error) throw new Error(error.message)
  if (!data || data.length === 0) throw new Error(ALREADY_PROCESSED)

  const { error: scheduleError } = await supabase.from('order_installments').insert(
    buildSchedule(totalDue, sale.installment_count, today).map((row) => ({
      ...row,
      order_id: sale.id,
    })),
  )

  if (scheduleError) {
    // Never leave a sale invoiced without its schedule: hand it back to
    // validation so the admin can simply try again.
    await supabase
      .from('orders')
      .update({
        sale_status: 'a_facturer',
        invoiced_at: null,
        delivery_fee: 0,
        timbre_fiscal: 0,
        // Order forms carry no account until invoiced (it's what shows
        // them in the customer's /compte), so back to none.
        user_id: null,
      })
      .eq('id', sale.id)
      .eq('sale_status', 'facture')
    throw new Error(`Impossible de générer l'échéancier : ${scheduleError.message}`)
  }

  await logActivity({
    actorId: actor.id,
    actorRole: actor.role,
    advisorId: sale.advisor_id,
    action: 'vente.facturee',
    entityType: 'order',
    entityId: reference,
    details: { totalDu: totalDue, fraisLivraison: deliveryFee, timbreFiscal },
  })
}

async function clientAccountId(clientId: string): Promise<string | null> {
  const supabase = createAdminClient()
  const { data } = await supabase.from('clients').select('user_id').eq('id', clientId).maybeSingle()
  return (data?.user_id as string | null) ?? null
}

/** Refusal sends the form back to the advisor as a draft, with the reason (D9). */
export async function refuseSale(reference: string, reason: string, actor: Actor): Promise<void> {
  const sale = await getSaleHeader(reference)
  const supabase = createAdminClient()

  const { data, error } = await supabase
    .from('orders')
    .update({ sale_status: 'brouillon', refusal_reason: reason, submitted_at: null })
    .eq('id', sale.id)
    .eq('sale_status', 'a_facturer')
    .select('id')

  if (error) throw new Error(error.message)
  if (!data || data.length === 0) throw new Error(ALREADY_PROCESSED)

  await logActivity({
    actorId: actor.id,
    actorRole: actor.role,
    advisorId: sale.advisor_id,
    action: 'vente.refusee',
    entityType: 'order',
    entityId: reference,
    details: { motif: reason },
  })
}

// ---------- ADMIN: PAYMENTS ----------

const PAYABLE: SaleStatus[] = ['facture', 'partiellement_paye', 'paye']

/**
 * Re-derives the sale's status from its instalments (D12): none paid →
 * facture, some → partiellement_paye, all → paye. `paid_at` is the date
 * the last instalment came in — the date the commission engine (phase 3)
 * will read, since a commission is earned only once the sale is fully
 * paid. `status` (the payment column) follows, so the existing badge
 * reads "Payée" too.
 */
async function recomputeSaleStatus(orderId: string, actor: Actor, reference: string, advisorId: string) {
  const supabase = createAdminClient()
  const { data: rows, error } = await supabase
    .from('order_installments')
    .select('paid_at')
    .eq('order_id', orderId)

  if (error) throw new Error(error.message)

  const paidDates = (rows ?? []).map((row) => row.paid_at as string | null)
  const paidCount = paidDates.filter(Boolean).length
  const allPaid = paidCount > 0 && paidCount === paidDates.length

  const next: SaleStatus = allPaid ? 'paye' : paidCount > 0 ? 'partiellement_paye' : 'facture'
  const lastPaid = allPaid ? (paidDates as string[]).sort().at(-1)! : null

  const { data: updated, error: updateError } = await supabase
    .from('orders')
    .update({
      sale_status: next,
      status: allPaid ? 'payee' : 'en_attente',
      paid_at: lastPaid,
    })
    .eq('id', orderId)
    .in('sale_status', PAYABLE)
    .neq('sale_status', next)
    .select('id')

  if (updateError) throw new Error(updateError.message)

  if (allPaid && updated && updated.length > 0) {
    await logActivity({
      actorId: actor.id,
      actorRole: actor.role,
      advisorId,
      action: 'vente.payee',
      entityType: 'order',
      entityId: reference,
      details: { soldeeLe: lastPaid },
    })
  }
}

async function getInstallmentWithSale(installmentId: string) {
  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('order_installments')
    .select('id, number, amount, paid_at, order_id, orders!inner ( reference, sale_status, advisor_id )')
    .eq('id', installmentId)
    .maybeSingle()

  if (error) throw new Error(error.message)
  if (!data) throw new Error('Tranche introuvable.')

  const row = data as unknown as {
    id: string
    number: number
    amount: number
    paid_at: string | null
    order_id: string
    orders: { reference: string; sale_status: SaleStatus; advisor_id: string }
  }
  if (!PAYABLE.includes(row.orders.sale_status)) {
    throw new Error("Cette vente n'accepte pas d'encaissement dans son état actuel.")
  }
  return row
}

/** Records the payment of one instalment (D11). */
export async function recordInstallmentPayment(
  installmentId: string,
  payment: { paidAt: string; method: InstallmentPaymentMethod; note: string },
  actor: Actor,
): Promise<void> {
  if (payment.paidAt > todayInTunis()) {
    throw new Error("La date d'encaissement ne peut pas être dans le futur.")
  }

  const installment = await getInstallmentWithSale(installmentId)
  const supabase = createAdminClient()

  const { data, error } = await supabase
    .from('order_installments')
    .update({
      paid_at: payment.paidAt,
      payment_method: payment.method,
      payment_note: payment.note || null,
      recorded_by: actor.id,
    })
    .eq('id', installmentId)
    .is('paid_at', null)
    .select('id')

  if (error) throw new Error(error.message)
  if (!data || data.length === 0) throw new Error('Cette tranche est déjà encaissée.')

  await logActivity({
    actorId: actor.id,
    actorRole: actor.role,
    advisorId: installment.orders.advisor_id,
    action: 'vente.tranche_encaissee',
    entityType: 'order',
    entityId: installment.orders.reference,
    details: {
      tranche: installment.number,
      montant: Number(installment.amount),
      le: payment.paidAt,
      mode: payment.method,
    },
  })

  await recomputeSaleStatus(
    installment.order_id,
    actor,
    installment.orders.reference,
    installment.orders.advisor_id,
  )

  // Fully paid now — or no longer: the commission engine settles either
  // way (phase 3, migration 0015).
  await reconcileSaleCommission(installment.order_id, actor.id)
}

/** Undoes a payment recorded by mistake. Logged like everything else. */
export async function undoInstallmentPayment(installmentId: string, actor: Actor): Promise<void> {
  const installment = await getInstallmentWithSale(installmentId)
  if (!installment.paid_at) return

  const supabase = createAdminClient()
  const { error } = await supabase
    .from('order_installments')
    .update({ paid_at: null, payment_method: null, payment_note: null, recorded_by: actor.id })
    .eq('id', installmentId)

  if (error) throw new Error(error.message)

  await logActivity({
    actorId: actor.id,
    actorRole: actor.role,
    advisorId: installment.orders.advisor_id,
    action: 'vente.encaissement_annule',
    entityType: 'order',
    entityId: installment.orders.reference,
    details: { tranche: installment.number, montant: Number(installment.amount) },
  })

  await recomputeSaleStatus(
    installment.order_id,
    actor,
    installment.orders.reference,
    installment.orders.advisor_id,
  )

  // Fully paid now — or no longer: the commission engine settles either
  // way (phase 3, migration 0015).
  await reconcileSaleCommission(installment.order_id, actor.id)
}

/**
 * Postpones due dates and/or re-spreads the amounts of the UNPAID
 * instalments (D14). Paid rows are history and never change. The new
 * schedule must still add up to the amount due, to the millime.
 */
export async function reviseSchedule(
  reference: string,
  rows: { id: string; dueDate: string; amount: number }[],
  actor: Actor,
): Promise<void> {
  const sale = await getSale(reference)
  if (!sale) throw new Error('Bon de commande introuvable.')
  if (!PAYABLE.includes(sale.saleStatus) || sale.saleStatus === 'paye') {
    throw new Error("L'échéancier de cette vente ne peut plus être modifié.")
  }

  const unpaid = new Map(
    sale.installments.filter((entry) => !entry.paidAt).map((entry) => [entry.id, entry]),
  )
  for (const row of rows) {
    if (!unpaid.has(row.id)) throw new Error('Seules les tranches non encaissées sont modifiables.')
    if (!(row.amount > 0)) throw new Error('Chaque tranche doit avoir un montant positif.')
  }

  const toMillimes = (value: number) => Math.round(value * 1000)
  const newAmounts = new Map(rows.map((row) => [row.id, row.amount]))
  const totalMillimes = sale.installments.reduce(
    (sum, entry) => sum + toMillimes(newAmounts.get(entry.id) ?? entry.amount),
    0,
  )
  if (totalMillimes !== toMillimes(sale.totalDue)) {
    throw new Error(
      `Les tranches doivent totaliser ${sale.totalDue.toFixed(3)} TND (actuellement ${(totalMillimes / 1000).toFixed(3)} TND).`,
    )
  }

  const supabase = createAdminClient()
  for (const row of rows) {
    const { error } = await supabase
      .from('order_installments')
      .update({ due_date: row.dueDate, amount: row.amount })
      .eq('id', row.id)
      .is('paid_at', null)
    if (error) throw new Error(error.message)
  }

  await logActivity({
    actorId: actor.id,
    actorRole: actor.role,
    advisorId: sale.advisorId,
    action: 'vente.echeancier_revise',
    entityType: 'order',
    entityId: reference,
    details: {
      tranches: rows.map((row) => ({ echeance: row.dueDate, montant: row.amount })),
    },
  })
}

// ---------- ADMIN: CANCELLATION ----------

/**
 * Cancels a submitted order form at any stage (D16). Delivery is
 * cancelled too unless it already happened, in which case it stays
 * `livree` — that is a fact, and a return is handled outside this flow.
 *
 * The previous status is logged: phase 3 reads it to claw back any
 * commission the sale had already earned.
 */
export async function cancelSale(reference: string, reason: string, actor: Actor): Promise<void> {
  const sale = await getSaleHeader(reference)
  if (sale.sale_status === 'annule') return
  if (sale.sale_status === 'brouillon') {
    throw new Error("Un brouillon n'est pas annulé : le conseiller peut le supprimer.")
  }

  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('orders')
    .update({
      sale_status: 'annule',
      status: 'annulee',
      cancel_reason: reason,
      cancelled_at: new Date().toISOString(),
      ...(sale.delivery_status !== 'livree' ? { delivery_status: 'annulee' } : {}),
    })
    .eq('id', sale.id)
    .eq('sale_status', sale.sale_status)
    .select('id')

  if (error) throw new Error(error.message)
  if (!data || data.length === 0) throw new Error(ALREADY_PROCESSED)

  await logActivity({
    actorId: actor.id,
    actorRole: actor.role,
    advisorId: sale.advisor_id,
    action: 'vente.annulee',
    entityType: 'order',
    entityId: reference,
    details: { motif: reason, statutPrecedent: sale.sale_status },
  })

  // A cancelled sale earns nothing: any commission it had is clawed back.
  await reconcileSaleCommission(sale.id, actor.id)
}
