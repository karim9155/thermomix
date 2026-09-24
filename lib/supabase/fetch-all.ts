import 'server-only'

/**
 * Reads every row of a query, a page at a time.
 *
 * Supabase's API returns at most 1000 rows per request (the project's
 * "Max rows" setting) and does so SILENTLY: a query over 1500 ledger
 * lines comes back with 1000 and no error. Anything that sums or counts
 * a table that can grow — the commission ledger, orders over a period,
 * link clicks — must page through it, or its totals drift wrong without
 * anyone noticing.
 *
 * `page(from, to)` must build the same query each time with `.range(from,
 * to)` applied and a stable, UNIQUE ordering (e.g. by id), or rows can
 * shift between pages. `max` caps the total for callers that only want
 * the first N.
 */
export async function fetchAll<T>(
  page: (from: number, to: number) => PromiseLike<{ data: T[] | null; error: { message: string } | null }>,
  options: { pageSize?: number; max?: number } = {},
): Promise<T[]> {
  const pageSize = options.pageSize ?? 1000
  const max = options.max ?? Number.POSITIVE_INFINITY
  const rows: T[] = []

  while (rows.length < max) {
    const from = rows.length
    const to = Math.min(from + pageSize, max) - 1
    const { data, error } = await page(from, to)
    if (error) throw new Error(error.message)

    const batch = data ?? []
    rows.push(...batch)
    if (batch.length < to - from + 1) break
  }

  return rows
}
