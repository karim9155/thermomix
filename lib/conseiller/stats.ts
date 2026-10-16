import 'server-only'
import { createAdminClient } from '@/lib/supabase/admin'
import { fetchAll } from '@/lib/supabase/fetch-all'
import { EMPTY_METRICS, metricsBetween, type Metrics } from '@/lib/conseiller/performance'

// Dashboards and statistics (domain J). Everything is computed live from
// the same definitions as grades and challenges (performance.ts): a sale
// counts on the day it becomes fully paid, revenue is products TTC.

// ---------- PERIOD ----------

export type Period = { from: string; to: string }

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/

/**
 * The period from ?du=&au= (inclusive days), defaulting to the current
 * month so far. A reversed range is put back in order rather than
 * rejected.
 */
export function parsePeriod(params: { du?: string; au?: string }, today: string): Period {
  const from = params.du && ISO_DATE.test(params.du) ? params.du : `${today.slice(0, 7)}-01`
  const to = params.au && ISO_DATE.test(params.au) ? params.au : today
  return from <= to ? { from, to } : { from: to, to: from }
}

function nextDay(isoDate: string): string {
  const date = new Date(`${isoDate}T12:00:00Z`)
  date.setUTCDate(date.getUTCDate() + 1)
  return date.toISOString().slice(0, 10)
}

const startOf = (day: string) => `${day}T00:00:00+01:00`

function sumMetrics(all: Iterable<Metrics>): Metrics {
  const total = { ...EMPTY_METRICS }
  for (const m of all) {
    total.sales += m.sales
    total.robots += m.robots
    total.revenue += m.revenue
    total.revenueHT += m.revenueHT
    total.recruits += m.recruits
  }
  return total
}

// ---------- NETWORK KPIs (J4) ----------

export type NetworkKpis = Metrics & {
  activeAdvisors: number
  invitedAdvisors: number
  commissions: number
  toInvoice: number
  outstanding: number
  lateInstallments: number
  workshopsDone: number
  clicks: number
  newClients: number
}

export async function getNetworkKpis(period: Period, today: string): Promise<NetworkKpis> {
  const supabase = createAdminClient()
  const lower = startOf(period.from)
  const upper = startOf(nextDay(period.to))

  const [metrics, advisors, commissions, toInvoice, installments, workshops, clicks, clients] =
    await Promise.all([
      metricsBetween(period.from, period.to),
      supabase.from('advisors').select('status'),
      fetchAll((from, to) =>
        supabase
          .from('commission_entries')
          .select('amount')
          .neq('kind', 'report')
          .gte('event_date', period.from)
          .lte('event_date', period.to)
          .order('id')
          .range(from, to),
      ).then((data) => ({ data })),
      supabase
        .from('orders')
        .select('id', { count: 'exact', head: true })
        .eq('sale_status', 'a_facturer'),
      // What is still owed on live sales, regardless of the period: a
      // balance is a "right now" number.
      fetchAll((from, to) =>
        supabase
          .from('order_installments')
          .select('amount, due_date, orders!inner ( sale_status )')
          .is('paid_at', null)
          .in('orders.sale_status', ['facture', 'partiellement_paye'])
          .order('id')
          .range(from, to),
      ).then((data) => ({ data })),
      supabase
        .from('workshops')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'effectue')
        .gte('scheduled_at', lower)
        .lt('scheduled_at', upper),
      supabase
        .from('affiliate_clicks')
        .select('id', { count: 'exact', head: true })
        .gte('created_at', lower)
        .lt('created_at', upper),
      supabase
        .from('clients')
        .select('id', { count: 'exact', head: true })
        .gte('created_at', lower)
        .lt('created_at', upper),
    ])

  const statuses = (advisors.data ?? []).map((row) => row.status)
  const unpaid = installments.data ?? []

  return {
    ...sumMetrics(metrics.values()),
    activeAdvisors: statuses.filter((s) => s === 'actif').length,
    invitedAdvisors: statuses.filter((s) => s === 'invite').length,
    commissions: (commissions.data ?? []).reduce((sum, row) => sum + Number(row.amount), 0),
    toInvoice: toInvoice.count ?? 0,
    outstanding: unpaid.reduce((sum, row) => sum + Number(row.amount), 0),
    lateInstallments: unpaid.filter((row) => row.due_date < today).length,
    workshopsDone: workshops.count ?? 0,
    clicks: clicks.count ?? 0,
    newClients: clients.count ?? 0,
  }
}

// ---------- LEADERBOARD (J5) ----------

export type LeaderboardRow = Metrics & {
  advisorId: string
  name: string
  region: string
  grade: string
  status: string
  commissions: number
}

export async function getLeaderboard(period: Period): Promise<LeaderboardRow[]> {
  const supabase = createAdminClient()
  const [metrics, advisors, commissions] = await Promise.all([
    metricsBetween(period.from, period.to),
    fetchAll((from, to) =>
      supabase
        .from('advisors')
        .select('user_id, prenom, nom, region, status, grades ( name )')
        .order('user_id')
        .range(from, to),
    ).then((data) => ({ data })),
    fetchAll((from, to) =>
      supabase
        .from('commission_entries')
        .select('advisor_id, amount')
        .neq('kind', 'report')
        .gte('event_date', period.from)
        .lte('event_date', period.to)
        .order('id')
        .range(from, to),
    ).then((data) => ({ data })),
  ])

  const earned = new Map<string, number>()
  for (const row of commissions.data ?? []) {
    earned.set(row.advisor_id, (earned.get(row.advisor_id) ?? 0) + Number(row.amount))
  }

  return (advisors.data ?? [])
    .map((advisor) => ({
      ...(metrics.get(advisor.user_id) ?? EMPTY_METRICS),
      advisorId: advisor.user_id,
      name: `${advisor.prenom} ${advisor.nom}`,
      region: advisor.region,
      grade: (advisor.grades as unknown as { name: string } | null)?.name ?? '—',
      status: advisor.status,
      commissions: earned.get(advisor.user_id) ?? 0,
    }))
    // Suspended or never-activated advisors only appear if they did something.
    .filter((row) => row.status === 'actif' || row.sales > 0 || row.recruits > 0 || row.commissions !== 0)
    .sort((a, b) => b.revenue - a.revenue || b.sales - a.sales || a.name.localeCompare(b.name, 'fr'))
}

// ---------- BY REGION (J6) ----------

export type RegionRow = { region: string; advisors: number; sales: number; revenue: number; robots: number }

/** Grouped by the advisor's region, from a leaderboard already loaded. */
export function statsByRegion(rows: LeaderboardRow[]): RegionRow[] {
  const byRegion = new Map<string, RegionRow>()
  for (const row of rows) {
    const current = byRegion.get(row.region) ?? { region: row.region, advisors: 0, sales: 0, revenue: 0, robots: 0 }
    if (row.status === 'actif') current.advisors += 1
    current.sales += row.sales
    current.revenue += row.revenue
    current.robots += row.robots
    byRegion.set(row.region, current)
  }
  return [...byRegion.values()].sort((a, b) => b.revenue - a.revenue || a.region.localeCompare(b.region, 'fr'))
}

// ---------- BY CLIENT PROFILE (J7) ----------

export type ProfileRow = { label: string; sales: number; revenue: number }

export const AGE_BUCKETS = ['Moins de 25 ans', '25–34 ans', '35–44 ans', '45–54 ans', '55–64 ans', '65 ans et plus'] as const
const UNKNOWN = 'Non renseigné'

function ageBucket(age: number | null): string {
  if (age === null) return UNKNOWN
  if (age < 25) return AGE_BUCKETS[0]
  if (age < 35) return AGE_BUCKETS[1]
  if (age < 45) return AGE_BUCKETS[2]
  if (age < 55) return AGE_BUCKETS[3]
  if (age < 65) return AGE_BUCKETS[4]
  return AGE_BUCKETS[5]
}

/**
 * Fully paid advisor sales in the period, by the client's age group and
 * sex. Only order forms carry a client record with age and sex, so web
 * orders aren't in these figures. Every bucket is returned, empty ones
 * included, so the rows keep the same order from one period to the next.
 */
export async function statsByClientProfile(
  period: Period,
  today: string,
): Promise<{ byAge: ProfileRow[]; bySex: ProfileRow[]; total: number }> {
  const supabase = createAdminClient()
  const data = await fetchAll((from, to) =>
    supabase
      .from('orders')
      .select('id, total_ttc, client:clients!orders_client_id_fkey ( annee_naissance, sexe )')
      .eq('source', 'conseiller')
      .eq('sale_status', 'paye')
      .gte('paid_at', startOf(period.from))
      .lt('paid_at', startOf(nextDay(period.to)))
      .order('id')
      .range(from, to),
  )

  const year = Number(today.slice(0, 4))
  const age = new Map<string, ProfileRow>(
    [...AGE_BUCKETS, UNKNOWN].map((label) => [label, { label, sales: 0, revenue: 0 }]),
  )
  const sexLabels: Record<string, string> = { F: 'Femmes', H: 'Hommes' }
  const sex = new Map<string, ProfileRow>(
    ['Femmes', 'Hommes', UNKNOWN].map((label) => [label, { label, sales: 0, revenue: 0 }]),
  )

  for (const row of data ?? []) {
    const client = row.client as unknown as { annee_naissance: number | null; sexe: string | null } | null
    const revenue = Number(row.total_ttc)
    const a = age.get(ageBucket(client?.annee_naissance ? year - client.annee_naissance : null))!
    a.sales += 1
    a.revenue += revenue
    const s = sex.get(client?.sexe ? (sexLabels[client.sexe] ?? UNKNOWN) : UNKNOWN)!
    s.sales += 1
    s.revenue += revenue
  }

  return { byAge: [...age.values()], bySex: [...sex.values()], total: (data ?? []).length }
}

// ---------- ADVISOR SNAPSHOT (J1, J10) ----------

export type AdvisorSnapshot = {
  month: Metrics
  quarter: Metrics
  commissionsMonth: number
  commissionsTotal: number
  paidOutTotal: number
  clients: number
  workshopsDone: number
  openSales: number
}

/** One advisor's figures: this month, the last 90 days, and to date. */
export async function getAdvisorSnapshot(advisorId: string, today: string): Promise<AdvisorSnapshot> {
  const supabase = createAdminClient()
  const monthStart = `${today.slice(0, 7)}-01`
  const quarterStart = (() => {
    const date = new Date(`${today}T12:00:00Z`)
    date.setUTCDate(date.getUTCDate() - 89)
    return date.toISOString().slice(0, 10)
  })()

  const [month, quarter, entries, payouts, clients, workshops, openSales] = await Promise.all([
    metricsBetween(monthStart, today, advisorId),
    metricsBetween(quarterStart, today, advisorId),
    fetchAll((from, to) =>
      supabase
        .from('commission_entries')
        .select('amount, event_date, kind')
        .eq('advisor_id', advisorId)
        .order('id')
        .range(from, to),
    ).then((data) => ({ data })),
    supabase.from('commission_payouts').select('amount').eq('advisor_id', advisorId),
    supabase.from('clients').select('id', { count: 'exact', head: true }).eq('advisor_id', advisorId),
    supabase
      .from('workshops')
      .select('id', { count: 'exact', head: true })
      .eq('advisor_id', advisorId)
      .eq('status', 'effectue'),
    supabase
      .from('orders')
      .select('id', { count: 'exact', head: true })
      .eq('advisor_id', advisorId)
      .in('sale_status', ['a_facturer', 'facture', 'partiellement_paye']),
  ])

  const lines = (entries.data ?? []).filter((row) => row.kind !== 'report')
  return {
    month: month.get(advisorId) ?? EMPTY_METRICS,
    quarter: quarter.get(advisorId) ?? EMPTY_METRICS,
    commissionsMonth: lines
      .filter((row) => row.event_date >= monthStart)
      .reduce((sum, row) => sum + Number(row.amount), 0),
    commissionsTotal: lines.reduce((sum, row) => sum + Number(row.amount), 0),
    paidOutTotal: (payouts.data ?? []).reduce((sum, row) => sum + Number(row.amount), 0),
    clients: clients.count ?? 0,
    workshopsDone: workshops.count ?? 0,
    openSales: openSales.count ?? 0,
  }
}

// ---------- EXPORT (J11) ----------

function csv(rows: (string | number)[][]): string {
  const cell = (value: string | number) => {
    const text = typeof value === 'number' ? String(value).replace('.', ',') : value
    return /[";\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text
  }
  // BOM + semicolons + decimal commas: what Excel expects on a French machine.
  return '﻿' + rows.map((row) => row.map(cell).join(';')).join('\r\n')
}

const money = (value: number) => Math.round(value * 1000) / 1000

export function leaderboardCsv(rows: LeaderboardRow[]): string {
  return csv([
    ['Rang', 'Conseiller', 'Région', 'Grade', 'Ventes', 'Thermomix', "Chiffre d'affaires TTC", 'Recrues', 'Primes'],
    ...rows.map((row, index) => [
      index + 1,
      row.name,
      row.region,
      row.grade,
      row.sales,
      row.robots,
      money(row.revenue),
      row.recruits,
      money(row.commissions),
    ]),
  ])
}

export function regionsCsv(rows: RegionRow[]): string {
  return csv([
    ['Région', 'Conseillers actifs', 'Ventes', 'Thermomix', "Chiffre d'affaires TTC"],
    ...rows.map((row) => [row.region, row.advisors, row.sales, row.robots, money(row.revenue)]),
  ])
}

export function profilesCsv(profile: { byAge: ProfileRow[]; bySex: ProfileRow[] }): string {
  return csv([
    ['Catégorie', 'Tranche', 'Ventes', "Chiffre d'affaires TTC"],
    ...profile.byAge.map((row) => ['Âge', row.label, row.sales, money(row.revenue)]),
    ...profile.bySex.map((row) => ['Sexe', row.label, row.sales, money(row.revenue)]),
  ])
}
