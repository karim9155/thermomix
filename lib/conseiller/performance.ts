import 'server-only'
import { cache } from 'react'
import { createAdminClient } from '@/lib/supabase/admin'
import { fetchAll } from '@/lib/supabase/fetch-all'

// What an advisor achieved over a date range — the numbers behind grade
// criteria (F4) and challenge rankings (H5). One definition for both, so
// "a sale" means the same thing everywhere:
//
//   a sale    = an order credited to the advisor (their own order form,
//               or a web order through their link) that is FULLY PAID,
//               dated by the day it became fully paid. Cancelled or
//               unpaid orders don't count — the same rule as commissions.
//   revenue   = products TTC of those sales (fees excluded)
//   revenueHT = products HT of those sales — display only, criteria use TTC
//   robots    = Thermomix robots in those sales
//   recruits  = direct recruits whose account became active in the range

export type Metrics = { sales: number; robots: number; revenue: number; revenueHT: number; recruits: number }

export const EMPTY_METRICS: Metrics = { sales: 0, robots: 0, revenue: 0, revenueHT: 0, recruits: 0 }

/** Tunis is UTC+1 all year (no daylight saving), so a day's bounds are fixed. */
function startOfDay(isoDate: string): string {
  return `${isoDate}T00:00:00+01:00`
}

function dayAfter(isoDate: string): string {
  const date = new Date(`${isoDate}T12:00:00Z`)
  date.setUTCDate(date.getUTCDate() + 1)
  return date.toISOString().slice(0, 10)
}

/**
 * Metrics for every advisor with activity between `from` and `to`
 * (inclusive calendar days, Tunis time). Advisors with none are absent
 * from the map — read them as EMPTY_METRICS.
 *
 * `advisorId` narrows the whole thing to one advisor. Pass it whenever
 * only one advisor's row will be read: an advisor's own dashboard asks
 * for three windows, and without it each one paged through EVERY
 * advisor's orders for that window just to keep a single key.
 *
 * Wrapped in cache() so the same (from, to, advisorId) within one request
 * is fetched once — the dashboard's grade window and its quarter window
 * are frequently the same three months.
 */
export const metricsBetween = cache(async function metricsBetween(
  from: string,
  to: string,
  advisorId?: string,
): Promise<Map<string, Metrics>> {
  const supabase = createAdminClient()
  const lower = startOfDay(from)
  const upper = startOfDay(dayAfter(to))

  const [orderRows, robotsSkus, recruitRows] = await Promise.all([
    // Paged: a year of a busy network is well past the API's 1000-row cap.
    fetchAll((from, to) => {
      let query = supabase
        .from('orders')
        .select('id, advisor_id, source, sale_status, status, subtotal_ht, total_ttc, order_items ( sku, quantity )')
        .not('advisor_id', 'is', null)
        .gte('paid_at', lower)
        .lt('paid_at', upper)
      if (advisorId) query = query.eq('advisor_id', advisorId)
      return query.order('id').range(from, to)
    }),
    robotSkus(),
    fetchAll((from, to) => {
      // Recruits are counted on the SPONSOR, so scoping by advisor means
      // filtering their downline, not their own row.
      let query = supabase
        .from('advisors')
        .select('user_id, sponsor_id')
        .not('sponsor_id', 'is', null)
        .neq('status', 'suspendu')
        .gte('activated_at', lower)
        .lt('activated_at', upper)
      if (advisorId) query = query.eq('sponsor_id', advisorId)
      return query.order('user_id').range(from, to)
    }),
  ])
  const orders = { data: orderRows }
  const recruits = { data: recruitRows }

  const robotSku = robotsSkus
  const result = new Map<string, Metrics>()
  const bump = (advisorId: string) => {
    const current = result.get(advisorId) ?? { ...EMPTY_METRICS }
    result.set(advisorId, current)
    return current
  }

  for (const order of orders.data ?? []) {
    // paid_at can linger on an order that was paid then cancelled; the
    // status is what decides whether it still counts.
    const fullyPaid =
      (order.source === 'conseiller' && order.sale_status === 'paye') ||
      (order.source === 'web' && order.status === 'payee')
    if (!fullyPaid || !order.advisor_id) continue

    const metrics = bump(order.advisor_id)
    metrics.sales += 1
    metrics.revenue += Number(order.total_ttc)
    metrics.revenueHT += Number(order.subtotal_ht)
    for (const item of (order.order_items ?? []) as { sku: string; quantity: number }[]) {
      if (robotSku.has(item.sku)) metrics.robots += item.quantity
    }
  }

  for (const row of recruits.data ?? []) {
    if (row.sponsor_id) bump(row.sponsor_id).recruits += 1
  }

  return result
})

/**
 * Which SKUs count as a Thermomix. The same answer for every window, so
 * the dashboard — which asks for metrics over three of them — pays for
 * it once instead of three times. A round trip to Supabase is the
 * expensive part here, not the row count.
 */
const robotSkus = cache(async (): Promise<Set<string>> => {
  const supabase = createAdminClient()
  const { data } = await supabase.from('products').select('sku').eq('category', 'robot')
  return new Set((data ?? []).map((row) => row.sku))
})

/** The first day of the window that ends today and spans `months` months. */
export function windowStart(today: string, months: number): string {
  const [year, month, day] = today.split('-').map(Number)
  const start = new Date(Date.UTC(year, month - 1 - months, day))
  start.setUTCDate(start.getUTCDate() + 1)
  return start.toISOString().slice(0, 10)
}
