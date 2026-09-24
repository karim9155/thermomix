import 'server-only'
import { createAdminClient } from '@/lib/supabase/admin'
import { fetchAll } from '@/lib/supabase/fetch-all'
import { logActivity, type ActorRole } from '@/lib/conseiller/activity'
import type {
  CommissionEntry,
  CommissionKind,
  CommissionRule,
  PeriodAdvisorTotal,
  PeriodSummary,
  PayoutMethod,
} from '@/lib/conseiller/format'

// Remuneration (domain G). The rules that WRITE commissions live in the
// database (migration 0015: reconcile_sale_commission and friends), where
// they run under a lock. This module calls them, reads the ledger, and
// handles what only an admin does: amounts, adjustments, closing, payouts.

type Actor = { id: string; role: ActorRole }

/** 'YYYY-MM-01' — how a month is stored and passed around. */
export type Month = string

export function monthFromParam(param: string | undefined): Month | null {
  return param && /^\d{4}-(0[1-9]|1[0-2])$/.test(param) ? `${param}-01` : null
}

export function monthParam(month: Month): string {
  return month.slice(0, 7)
}

// ---------- ENGINE ----------

/**
 * Brings one order's commissions in line with its state (sale bonus, and
 * the sponsor's recruitment bonus). Idempotent: call it after anything
 * that can change whether a sale is fully paid — a payment, an undone
 * payment, a cancellation.
 *
 * Never throws. The change that triggered it has already happened and is
 * the fact of record; a failure here is logged, and the "Recalculer les
 * primes" button on the order form re-runs it.
 */
export async function reconcileSaleCommission(orderId: string, actorId: string | null): Promise<void> {
  const supabase = createAdminClient()
  const { error } = await supabase.rpc('reconcile_sale_commission', {
    p_order: orderId,
    p_actor: actorId,
  })
  if (error) {
    console.error(`[remuneration] Échec du calcul des primes (commande ${orderId}):`, error)
  }
}

/** Same, but reports failure — for the explicit "recalculate" button. */
export async function recalculateSaleCommission(orderId: string, actorId: string): Promise<void> {
  const supabase = createAdminClient()
  const { error } = await supabase.rpc('reconcile_sale_commission', {
    p_order: orderId,
    p_actor: actorId,
  })
  if (error) throw new Error(`Calcul des primes impossible : ${error.message}`)
}

// ---------- LEDGER READS ----------

type EntryRow = {
  id: number
  advisor_id: string
  period_month: string
  kind: CommissionKind
  amount: number
  event_date: string
  label: string
  details: Record<string, unknown> | null
  created_at: string
  order: { reference: string } | null
}

const ENTRY_SELECT = `
  id, advisor_id, period_month, kind, amount, event_date, label, details, created_at,
  order:orders!commission_entries_order_id_fkey ( reference )
`

function mapEntry(row: EntryRow): CommissionEntry {
  return {
    id: row.id,
    advisorId: row.advisor_id,
    month: row.period_month,
    kind: row.kind,
    amount: Number(row.amount),
    eventDate: row.event_date,
    label: row.label,
    orderReference: row.order?.reference ?? null,
    createdAt: row.created_at,
  }
}

export async function listEntries(options: {
  advisorId?: string
  month?: Month
  orderId?: string
}): Promise<CommissionEntry[]> {
  const supabase = createAdminClient()
  let query = supabase
    .from('commission_entries')
    .select(ENTRY_SELECT)
    .order('event_date', { ascending: false })
    .order('id', { ascending: false })

  if (options.advisorId) query = query.eq('advisor_id', options.advisorId)
  if (options.month) query = query.eq('period_month', options.month)
  if (options.orderId) query = query.eq('order_id', options.orderId)

  const { data, error } = await query
  if (error) throw new Error(error.message)
  return ((data ?? []) as unknown as EntryRow[]).map(mapEntry)
}

// ---------- PERIODS ----------

type PeriodRow = { month: string; status: 'ouverte' | 'cloturee'; closed_at: string | null }

async function loadPeriods(): Promise<PeriodRow[]> {
  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('commission_periods')
    .select('month, status, closed_at')
    .order('month', { ascending: false })
  if (error) throw new Error(error.message)
  return (data ?? []) as PeriodRow[]
}

/** The 15th of the month after — when a month's earnings become payable. */
export function paydayOf(month: Month): string {
  const [year, mon] = month.split('-').map(Number)
  const next = new Date(Date.UTC(year, mon, 15))
  return next.toISOString().slice(0, 10)
}

/**
 * Every month with activity, newest first, with its totals (admin). One
 * query for the ledger and one for payouts, summed in memory — a month
 * holds a few hundred lines at most.
 */
export async function listPeriodSummaries(): Promise<PeriodSummary[]> {
  const supabase = createAdminClient()
  // The whole ledger: paged, it outgrows the API's 1000-row cap quickly.
  const [periods, entryRows, payoutRows] = await Promise.all([
    loadPeriods(),
    fetchAll((from, to) =>
      supabase.from('commission_entries').select('period_month, advisor_id, amount').order('id').range(from, to),
    ),
    fetchAll((from, to) =>
      supabase
        .from('commission_payouts')
        .select('period_month, amount')
        .order('period_month')
        .order('advisor_id')
        .range(from, to),
    ),
  ])
  const entries = { data: entryRows }
  const payouts = { data: payoutRows }

  return periods.map((period) => {
    const byAdvisor = new Map<string, number>()
    for (const row of entries.data ?? []) {
      if (row.period_month !== period.month) continue
      byAdvisor.set(row.advisor_id, (byAdvisor.get(row.advisor_id) ?? 0) + Number(row.amount))
    }
    const payable = [...byAdvisor.values()].filter((total) => total > 0.0005)
    const monthPayouts = (payouts.data ?? []).filter((row) => row.period_month === period.month)

    return {
      month: period.month,
      status: period.status,
      closedAt: period.closed_at,
      payday: paydayOf(period.month),
      total: [...byAdvisor.values()].reduce((sum, total) => sum + total, 0),
      advisorCount: payable.length,
      paidCount: monthPayouts.length,
      paidTotal: monthPayouts.reduce((sum, row) => sum + Number(row.amount), 0),
    }
  })
}

/** One month, advisor by advisor, with what was paid (admin, G10/G13). */
export async function getPeriodAdvisorTotals(month: Month): Promise<{
  status: 'ouverte' | 'cloturee' | null
  totals: PeriodAdvisorTotal[]
}> {
  const supabase = createAdminClient()
  const [period, entries, payouts, advisors] = await Promise.all([
    supabase.from('commission_periods').select('status').eq('month', month).maybeSingle(),
    fetchAll((from, to) =>
      supabase
        .from('commission_entries')
        .select('advisor_id, kind, amount')
        .eq('period_month', month)
        .order('id')
        .range(from, to),
    ).then((data) => ({ data })),
    supabase
      .from('commission_payouts')
      .select('advisor_id, amount, paid_at, method, reference')
      .eq('period_month', month),
    fetchAll((from, to) =>
      supabase.from('advisors').select('user_id, prenom, nom, telephone').order('user_id').range(from, to),
    ).then((data) => ({ data })),
  ])

  const names = new Map((advisors.data ?? []).map((a) => [a.user_id, a]))
  const payoutBy = new Map((payouts.data ?? []).map((p) => [p.advisor_id, p]))
  const totals = new Map<string, PeriodAdvisorTotal>()

  for (const row of entries.data ?? []) {
    const advisor = names.get(row.advisor_id)
    const current: PeriodAdvisorTotal = totals.get(row.advisor_id) ?? {
      advisorId: row.advisor_id,
      advisorName: advisor ? `${advisor.prenom} ${advisor.nom}` : '—',
      telephone: advisor?.telephone ?? '',
      byKind: {},
      total: 0,
      payout: null,
    }
    const kind = row.kind as CommissionKind
    current.byKind[kind] = (current.byKind[kind] ?? 0) + Number(row.amount)
    current.total += Number(row.amount)
    totals.set(row.advisor_id, current)
  }

  for (const [advisorId, total] of totals) {
    const payout = payoutBy.get(advisorId)
    if (payout) {
      total.payout = {
        amount: Number(payout.amount),
        paidAt: payout.paid_at,
        method: payout.method as PayoutMethod | null,
        reference: payout.reference,
      }
    }
  }

  return {
    status: (period.data?.status as 'ouverte' | 'cloturee' | undefined) ?? null,
    totals: [...totals.values()].sort((a, b) => b.total - a.total),
  }
}

// ---------- ADVISOR VIEW ----------

export type AdvisorMonth = {
  month: Month
  status: 'ouverte' | 'cloturee'
  payday: string
  total: number
  payout: { amount: number; paidAt: string } | null
}

/**
 * An advisor's months, newest first (G5–G7): what each one adds up to,
 * and whether it is still running (open), payable (closed, not paid) or
 * paid.
 */
export async function listAdvisorMonths(advisorId: string): Promise<AdvisorMonth[]> {
  const supabase = createAdminClient()
  const [periods, entries, payouts] = await Promise.all([
    loadPeriods(),
    fetchAll((from, to) =>
      supabase
        .from('commission_entries')
        .select('period_month, amount')
        .eq('advisor_id', advisorId)
        .order('id')
        .range(from, to),
    ).then((data) => ({ data })),
    supabase
      .from('commission_payouts')
      .select('period_month, amount, paid_at')
      .eq('advisor_id', advisorId),
  ])

  const totals = new Map<string, number>()
  for (const row of entries.data ?? []) {
    totals.set(row.period_month, (totals.get(row.period_month) ?? 0) + Number(row.amount))
  }
  const payoutBy = new Map((payouts.data ?? []).map((p) => [p.period_month, p]))

  return periods
    .filter((period) => totals.has(period.month))
    .map((period) => {
      const payout = payoutBy.get(period.month)
      return {
        month: period.month,
        status: period.status,
        payday: paydayOf(period.month),
        total: totals.get(period.month) ?? 0,
        payout: payout ? { amount: Number(payout.amount), paidAt: payout.paid_at } : null,
      }
    })
}

// ---------- RULES ----------

export async function listRules(): Promise<CommissionRule[]> {
  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('commission_rules')
    .select('id, grade_id, robot_sale_bonus, recruitment_bonus, effective_from, grades ( name, rank )')
    .order('effective_from', { ascending: false })
  if (error) throw new Error(error.message)

  return (data ?? []).map((row) => {
    const grade = row.grades as unknown as { name: string; rank: number } | null
    return {
      id: row.id,
      gradeId: row.grade_id,
      gradeName: grade?.name ?? '—',
      gradeRank: grade?.rank ?? 0,
      robotSaleBonus: Number(row.robot_sale_bonus),
      recruitmentBonus: Number(row.recruitment_bonus),
      effectiveFrom: row.effective_from,
    }
  })
}

/**
 * New amounts for a grade from a date (G8, F3). Never edits a rule: it
 * adds one, so every past sale keeps being valued with the rule in force
 * when it was paid. The date can't be in the past for the same reason.
 */
export async function setRule(
  input: { gradeId: string; robotSaleBonus: number; recruitmentBonus: number; effectiveFrom: string },
  actor: Actor,
  today: string,
): Promise<void> {
  if (input.effectiveFrom < today) {
    throw new Error("La date d'effet ne peut pas être dans le passé.")
  }

  const supabase = createAdminClient()
  const { error } = await supabase.from('commission_rules').upsert(
    {
      grade_id: input.gradeId,
      robot_sale_bonus: input.robotSaleBonus,
      recruitment_bonus: input.recruitmentBonus,
      effective_from: input.effectiveFrom,
      created_by: actor.id,
    },
    // Same grade, same date: the admin is correcting a rule that hasn't
    // started yet, so replace it rather than fail.
    { onConflict: 'grade_id,effective_from' },
  )
  if (error) throw new Error(error.message)

  await logActivity({
    actorId: actor.id,
    actorRole: actor.role,
    advisorId: null,
    action: 'remuneration.regle_modifiee',
    entityType: 'grade',
    entityId: input.gradeId,
    details: {
      primeRobot: input.robotSaleBonus,
      bonusRecrutement: input.recruitmentBonus,
      aPartirDu: input.effectiveFrom,
    },
  })
}

// ---------- ADJUSTMENTS ----------

/** A manual bonus (positive) or deduction (negative), with a reason (G9). */
export async function addAdjustment(
  input: { advisorId: string; amount: number; label: string },
  actor: Actor,
  today: string,
): Promise<void> {
  const supabase = createAdminClient()

  const { data: period, error: periodError } = await supabase.rpc('commission_period_for', {
    p_date: today,
  })
  if (periodError) throw new Error(periodError.message)

  const { error } = await supabase.from('commission_entries').insert({
    advisor_id: input.advisorId,
    period_month: period as string,
    kind: 'ajustement',
    amount: input.amount,
    event_date: today,
    label: input.label,
    created_by: actor.id,
  })
  if (error) throw new Error(error.message)

  await logActivity({
    actorId: actor.id,
    actorRole: actor.role,
    advisorId: input.advisorId,
    action: 'remuneration.ajustement',
    details: { montant: input.amount, motif: input.label },
  })
}

// ---------- CLOSING AND PAYOUTS ----------

export async function closePeriod(month: Month, actor: Actor): Promise<void> {
  const supabase = createAdminClient()
  const { error } = await supabase.rpc('close_commission_period', {
    p_month: month,
    p_actor: actor.id,
  })
  if (error) {
    if (error.message.includes('periode_en_cours')) {
      throw new Error('Le mois en cours ne peut pas être clôturé.')
    }
    throw new Error(error.message)
  }

  await logActivity({
    actorId: actor.id,
    actorRole: actor.role,
    advisorId: null,
    action: 'remuneration.periode_cloturee',
    entityType: 'period',
    entityId: month,
  })
}

/** Run by the cron: closes every month whose 15th has come. */
export async function closeDuePeriods(): Promise<number> {
  const supabase = createAdminClient()
  const { data, error } = await supabase.rpc('close_due_commission_periods')
  if (error) throw new Error(error.message)

  const closed = Number(data ?? 0)
  if (closed > 0) {
    await logActivity({
      actorId: null,
      actorRole: 'systeme',
      advisorId: null,
      action: 'remuneration.periode_cloturee',
      details: { automatique: true, nombre: closed },
    })
  }
  return closed
}

/**
 * Marks an advisor's month as paid out (G13). The amount is the month's
 * net, computed here — never typed in — and only a closed month, whose
 * total can no longer move, can be paid.
 */
export async function recordPayout(
  input: { month: Month; advisorId: string; paidAt: string; method: PayoutMethod; reference: string },
  actor: Actor,
): Promise<void> {
  const supabase = createAdminClient()

  const { data: period } = await supabase
    .from('commission_periods')
    .select('status')
    .eq('month', input.month)
    .maybeSingle()
  if (period?.status !== 'cloturee') {
    throw new Error("Seul un mois clôturé peut être versé.")
  }

  // The amount actually paid out: paged, so it can never be short.
  const rows = await fetchAll((from, to) =>
    supabase
      .from('commission_entries')
      .select('amount')
      .eq('period_month', input.month)
      .eq('advisor_id', input.advisorId)
      .order('id')
      .range(from, to),
  )

  const millimes = (rows ?? []).reduce((sum, row) => sum + Math.round(Number(row.amount) * 1000), 0)
  if (millimes <= 0) throw new Error('Rien à verser pour ce conseiller ce mois-ci.')

  const { error } = await supabase.from('commission_payouts').insert({
    period_month: input.month,
    advisor_id: input.advisorId,
    amount: millimes / 1000,
    paid_at: input.paidAt,
    method: input.method,
    reference: input.reference || null,
    recorded_by: actor.id,
  })
  if (error) {
    if (error.code === '23505') throw new Error('Ce versement est déjà enregistré.')
    throw new Error(error.message)
  }

  await logActivity({
    actorId: actor.id,
    actorRole: actor.role,
    advisorId: input.advisorId,
    action: 'remuneration.versement',
    entityType: 'period',
    entityId: input.month,
    details: { montant: millimes / 1000, mode: input.method, le: input.paidAt },
  })
}

/** Removes a payout recorded by mistake. Logged. */
export async function cancelPayout(month: Month, advisorId: string, actor: Actor): Promise<void> {
  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('commission_payouts')
    .delete()
    .eq('period_month', month)
    .eq('advisor_id', advisorId)
    .select('amount')
  if (error) throw new Error(error.message)
  if (!data || data.length === 0) return

  await logActivity({
    actorId: actor.id,
    actorRole: actor.role,
    advisorId,
    action: 'remuneration.versement_annule',
    entityType: 'period',
    entityId: month,
    details: { montant: Number(data[0].amount) },
  })
}

// ---------- EXPORT ----------

function csvCell(value: string | number): string {
  const text = String(value)
  return /[";\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text
}

/**
 * The month's payroll as CSV (G14). Semicolon-separated with a BOM and a
 * decimal comma, which is what Excel expects on a French-locale machine.
 */
export async function periodCsv(month: Month): Promise<string> {
  const { totals } = await getPeriodAdvisorTotals(month)
  const money = (value: number | undefined) => (value ?? 0).toFixed(3).replace('.', ',')

  const header = [
    'Conseiller',
    'Téléphone',
    'Primes de vente',
    'Bonus de recrutement',
    'Challenges',
    'Ajustements',
    'Reports',
    'Total',
    'Versé le',
    'Mode',
    'Référence',
  ]
  const lines = totals.map((row) =>
    [
      row.advisorName,
      row.telephone,
      money(row.byKind.vente),
      money(row.byKind.recrutement),
      money(row.byKind.challenge),
      money(row.byKind.ajustement),
      money(row.byKind.report),
      money(row.total),
      row.payout?.paidAt ?? '',
      row.payout?.method ?? '',
      row.payout?.reference ?? '',
    ]
      .map(csvCell)
      .join(';'),
  )

  return '﻿' + [header.map(csvCell).join(';'), ...lines].join('\r\n')
}
