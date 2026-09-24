import 'server-only'
import { cookies } from 'next/headers'
import { createAdminClient } from '@/lib/supabase/admin'
import { fetchAll } from '@/lib/supabase/fetch-all'
import { logActivity, type ActorRole } from '@/lib/conseiller/activity'
import { generateAffiliateCode } from '@/lib/conseiller/accounts'
import { reconcileSaleCommission } from '@/lib/conseiller/remuneration'

// Affiliate links (domain I). See migration 0016 for the rules: last
// link opened wins, attribution is permanent once tied to an account, and
// an advisor is never attributed their own purchases.

type Actor = { id: string; role: ActorRole }

/** `<CODE>.<epoch ms of the click>` — the click time makes "last wins" work across devices. */
export const REF_COOKIE = 'ino_ref'
/** Random per-browser id, to count visitors rather than raw clicks. */
export const VISITOR_COOKIE = 'ino_vid'
/**
 * Browsers cap cookie lifetime at about 400 days whatever we ask for.
 * That's the most a cookie can do; it only has to last until the
 * customer signs in once, after which the attribution lives on the
 * account and never expires.
 */
export const REF_COOKIE_MAX_AGE = 400 * 24 * 60 * 60

export function affiliateUrl(code: string): string {
  const site = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'
  return new URL(`/parrainage/${encodeURIComponent(code)}`, site).toString()
}

export function encodeRefCookie(code: string, clickedAt: Date): string {
  return `${code}.${clickedAt.getTime()}`
}

function parseRefCookie(value: string | undefined): { code: string; clickedAt: Date } | null {
  if (!value) return null
  const dot = value.lastIndexOf('.')
  if (dot <= 0) return null
  const code = value.slice(0, dot)
  const time = Number(value.slice(dot + 1))
  if (!Number.isFinite(time) || time <= 0) return null
  // A timestamp from the future would make one click beat every later one.
  return { code, clickedAt: new Date(Math.min(time, Date.now())) }
}

/** Link previews (WhatsApp, Facebook, Slack…) fetch the URL too; they aren't visitors. */
export function isPreviewBot(userAgent: string | null): boolean {
  return /bot|crawl|spider|preview|facebookexternalhit|whatsapp|telegram|slack|discord|skype/i.test(
    userAgent ?? '',
  )
}

/** How an advisor is named to a customer: first name and initial. */
function publicName(prenom: string, nom: string): string {
  return `${prenom} ${nom.slice(0, 1)}.`.trim()
}

/** The advisor behind a code, if the code is live and the advisor active. */
export async function findAdvisorByCode(
  code: string,
): Promise<{ id: string; name: string } | null> {
  const normalized = code.trim().toUpperCase()
  if (!/^[A-Z0-9-]{3,40}$/.test(normalized)) return null

  const supabase = createAdminClient()
  const { data } = await supabase
    .from('advisors')
    .select('user_id, prenom, nom')
    .eq('affiliate_code', normalized)
    .eq('affiliate_code_active', true)
    .eq('status', 'actif')
    .maybeSingle()

  return data ? { id: data.user_id, name: publicName(data.prenom, data.nom) } : null
}

export async function recordClick(advisorId: string, visitorId: string, landing: string): Promise<void> {
  const supabase = createAdminClient()
  const { error } = await supabase
    .from('affiliate_clicks')
    .insert({ advisor_id: advisorId, visitor_id: visitorId, landing })
  if (error) console.error('[parrainage] Clic non enregistré:', error)
}

/**
 * Attributes a customer to an advisor for a click made at clickedAt,
 * unless a newer click already won. Never throws.
 */
export async function attributeCustomer(userId: string, advisorId: string, clickedAt: Date) {
  const { error } = await createAdminClient().rpc('record_customer_attribution', {
    p_user: userId,
    p_advisor: advisorId,
    p_clicked_at: clickedAt.toISOString(),
  })
  if (error) console.error('[parrainage] Attribution impossible:', error)
}

/**
 * Ties the link in this browser's cookie to a customer account (I6/I7):
 * the step that makes attribution permanent. Call it wherever a customer
 * session is known — sign-in, email confirmation, checkout, or opening
 * a link while signed in.
 *
 * Never throws: attribution is never worth failing a sign-in or an order
 * over. Returns the advisor the account is attributed to after the sync.
 */
export async function syncAttributionFromCookie(userId: string): Promise<string | null> {
  try {
    const store = await cookies()
    const ref = parseRefCookie(store.get(REF_COOKIE)?.value)
    const supabase = createAdminClient()

    if (ref) {
      const advisor = await findAdvisorByCode(ref.code)
      if (advisor) {
        const { data, error } = await supabase.rpc('record_customer_attribution', {
          p_user: userId,
          p_advisor: advisor.id,
          p_clicked_at: ref.clickedAt.toISOString(),
        })
        if (error) throw error
        return (data as string | null) ?? null
      }
    }

    const { data } = await supabase
      .from('customer_attributions')
      .select('advisor_id')
      .eq('user_id', userId)
      .maybeSingle()
    return data?.advisor_id ?? null
  } catch (error) {
    console.error('[parrainage] Synchronisation impossible:', error)
    return null
  }
}

/**
 * The advisor a new web order belongs to, or null. Called by checkout
 * right before the order is saved, so the attribution is decided on the
 * server and never by anything the browser sends (I6).
 *
 * A suspended advisor, or one whose code was disabled, gets nothing new.
 */
export async function advisorForNewOrder(userId: string): Promise<string | null> {
  const advisorId = await syncAttributionFromCookie(userId)
  if (!advisorId || advisorId === userId) return null

  const supabase = createAdminClient()
  const { data } = await supabase
    .from('advisors')
    .select('status, affiliate_code_active')
    .eq('user_id', advisorId)
    .maybeSingle()

  return data?.status === 'actif' && data.affiliate_code_active ? advisorId : null
}

/**
 * The advisor a customer's next order would go to, WITHOUT recording
 * anything — for showing "Conseiller : Karim B." at checkout. Mirrors the
 * rules of syncAttributionFromCookie + advisorForNewOrder: the newer of
 * the cookie's click and the account's saved attribution, if that
 * advisor is still active.
 */
export async function previewAttribution(userId: string): Promise<{ name: string } | null> {
  try {
    const store = await cookies()
    const ref = parseRefCookie(store.get(REF_COOKIE)?.value)
    const supabase = createAdminClient()

    const { data: saved } = await supabase
      .from('customer_attributions')
      .select('advisor_id, clicked_at')
      .eq('user_id', userId)
      .maybeSingle()

    if (ref) {
      const advisor = await findAdvisorByCode(ref.code)
      if (
        advisor &&
        advisor.id !== userId &&
        (!saved || new Date(saved.clicked_at) < ref.clickedAt)
      ) {
        return { name: advisor.name }
      }
    }

    if (!saved || saved.advisor_id === userId) return null

    const { data: advisor } = await supabase
      .from('advisors')
      .select('prenom, nom, status, affiliate_code_active')
      .eq('user_id', saved.advisor_id)
      .maybeSingle()

    return advisor?.status === 'actif' && advisor.affiliate_code_active
      ? { name: publicName(advisor.prenom, advisor.nom) }
      : null
  } catch {
    return null
  }
}

/**
 * Checks a code typed at checkout (I2). Returns the advisor it belongs
 * to, or the reason it can't be used.
 */
export async function checkAdvisorCode(
  code: string,
  userId: string,
): Promise<{ id: string; name: string } | { error: string }> {
  const advisor = await findAdvisorByCode(code)
  if (!advisor) return { error: 'Code conseiller invalide ou désactivé.' }
  if (advisor.id === userId) {
    return { error: 'Vous ne pouvez pas utiliser votre propre code conseiller.' }
  }
  return advisor
}

// ---------- ADVISOR STATS (I8) ----------

export type AffiliateOrder = {
  reference: string
  createdAt: string
  customer: string
  totalTTC: number
  deliveryStatus: string
  paid: boolean
  attributionSource: 'lien' | 'admin' | null
}

export type AffiliateStats = {
  clicks: number
  clicks30d: number
  visitors: number
  customers: number
  orders: AffiliateOrder[]
  paidOrders: number
  /** Orders per unique visitor, 0–1. */
  conversion: number
}

export async function getAffiliateStats(advisorId: string): Promise<AffiliateStats> {
  const supabase = createAdminClient()
  const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()

  const [clicks, clicks30d, visitors, customers, orders] = await Promise.all([
    supabase.from('affiliate_clicks').select('id', { count: 'exact', head: true }).eq('advisor_id', advisorId),
    supabase
      .from('affiliate_clicks')
      .select('id', { count: 'exact', head: true })
      .eq('advisor_id', advisorId)
      .gte('created_at', since),
    // Clicks pile up fastest of anything: paged past the 1000-row cap.
    fetchAll((from, to) =>
      supabase
        .from('affiliate_clicks')
        .select('visitor_id')
        .eq('advisor_id', advisorId)
        .order('id')
        .range(from, to),
    ).then((data) => ({ data })),
    supabase
      .from('customer_attributions')
      .select('user_id', { count: 'exact', head: true })
      .eq('advisor_id', advisorId),
    supabase
      .from('orders')
      .select('reference, created_at, prenom, nom, total_ttc, delivery_status, status, attribution_source')
      .eq('source', 'web')
      .eq('advisor_id', advisorId)
      .order('created_at', { ascending: false }),
  ])

  const visitorCount = new Set((visitors.data ?? []).map((row) => row.visitor_id)).size
  const orderRows = (orders.data ?? []).map((row) => ({
    reference: row.reference,
    createdAt: row.created_at,
    // First name and initial: the advisor needs to recognise the order,
    // not to hold the customer's full identity.
    customer: `${row.prenom} ${String(row.nom ?? '').slice(0, 1)}.`,
    totalTTC: Number(row.total_ttc),
    deliveryStatus: row.delivery_status,
    paid: row.status === 'payee',
    attributionSource: (row.attribution_source as 'lien' | 'admin' | null) ?? null,
  }))
  const linkOrders = orderRows.filter((order) => order.attributionSource === 'lien').length

  return {
    clicks: clicks.count ?? 0,
    clicks30d: clicks30d.count ?? 0,
    visitors: visitorCount,
    customers: customers.count ?? 0,
    orders: orderRows,
    paidOrders: orderRows.filter((order) => order.paid).length,
    conversion: visitorCount > 0 ? Math.min(1, linkOrders / visitorCount) : 0,
  }
}

// ---------- ADMIN (I9, I10) ----------

/**
 * Attributes a web order to an advisor by hand, or detaches it (I9). The
 * commission engine then moves any commission already earned: the
 * previous advisor's line is reversed, the new advisor's written.
 */
export async function reassignWebOrder(
  reference: string,
  advisorId: string | null,
  actor: Actor,
): Promise<void> {
  const supabase = createAdminClient()

  const { data: order, error } = await supabase
    .from('orders')
    .select('id, source, advisor_id, user_id')
    .eq('reference', reference)
    .maybeSingle()
  if (error) throw new Error(error.message)
  if (!order) throw new Error('Commande introuvable.')
  if (order.source !== 'web') {
    throw new Error("Une vente conseiller appartient au conseiller qui l'a saisie.")
  }
  if (order.advisor_id === advisorId) return

  if (advisorId) {
    if (advisorId === order.user_id) {
      throw new Error('Un conseiller ne peut pas se voir attribuer ses propres achats.')
    }
    const { data: advisor } = await supabase
      .from('advisors')
      .select('status')
      .eq('user_id', advisorId)
      .maybeSingle()
    if (!advisor) throw new Error('Conseiller introuvable.')
    if (advisor.status === 'suspendu') throw new Error('Ce conseiller est suspendu.')
  }

  const { error: updateError } = await supabase
    .from('orders')
    .update({ advisor_id: advisorId, attribution_source: advisorId ? 'admin' : null })
    .eq('id', order.id)
  if (updateError) throw new Error(updateError.message)

  for (const id of [order.advisor_id, advisorId].filter(Boolean) as string[]) {
    await logActivity({
      actorId: actor.id,
      actorRole: actor.role,
      advisorId: id,
      action: 'parrainage.commande_reattribuee',
      entityType: 'order',
      entityId: reference,
      details: { de: order.advisor_id, vers: advisorId },
    })
  }

  await reconcileSaleCommission(order.id, actor.id)
}

/**
 * Issues a new code (I10). The old link stops working at once; customers
 * already attributed stay attributed — attribution follows the advisor,
 * not the code.
 */
export async function regenerateAffiliateCode(advisorId: string, actor: Actor): Promise<string> {
  const supabase = createAdminClient()
  const { data: advisor } = await supabase
    .from('advisors')
    .select('prenom, affiliate_code')
    .eq('user_id', advisorId)
    .maybeSingle()
  if (!advisor) throw new Error('Conseiller introuvable.')

  for (let attempt = 0; attempt < 5; attempt++) {
    const code = generateAffiliateCode(advisor.prenom)
    const { error } = await supabase.from('advisors').update({ affiliate_code: code }).eq('user_id', advisorId)
    if (!error) {
      await logActivity({
        actorId: actor.id,
        actorRole: actor.role,
        advisorId,
        action: 'parrainage.code_regenere',
        details: { ancien: advisor.affiliate_code, nouveau: code },
      })
      return code
    }
    if (error.code !== '23505') throw new Error(error.message)
  }
  throw new Error('Impossible de générer un code unique. Merci de réessayer.')
}

/** Turns a code off or back on (I10). */
export async function setAffiliateCodeActive(
  advisorId: string,
  active: boolean,
  actor: Actor,
): Promise<void> {
  const supabase = createAdminClient()
  const { error } = await supabase
    .from('advisors')
    .update({ affiliate_code_active: active })
    .eq('user_id', advisorId)
  if (error) throw new Error(error.message)

  await logActivity({
    actorId: actor.id,
    actorRole: actor.role,
    advisorId,
    action: active ? 'parrainage.code_active' : 'parrainage.code_desactive',
  })
}
