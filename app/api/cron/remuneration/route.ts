import { NextResponse } from 'next/server'
import { closeDuePeriods } from '@/lib/conseiller/remuneration'

export const dynamic = 'force-dynamic'

const NOINDEX_HEADERS = { 'X-Robots-Tag': 'noindex' }

/**
 * Closes and locks every commission month whose payday — the 15th of the
 * following month — has arrived (G12). Called daily by Vercel Cron (see
 * vercel.json) rather than only on the 15th, so a missed run catches up
 * the next day; closing is idempotent, so running daily costs nothing.
 *
 * Vercel sends `Authorization: Bearer <CRON_SECRET>`. The secret must be
 * set: without the explicit check below, an unset CRON_SECRET would make
 * the expected header "Bearer undefined", which anyone can send.
 */
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET
  if (!secret || request.headers.get('authorization') !== `Bearer ${secret}`) {
    return NextResponse.json(
      { ok: false, error: 'Unauthorized' },
      { status: 401, headers: NOINDEX_HEADERS },
    )
  }

  try {
    const closed = await closeDuePeriods()
    return NextResponse.json({ ok: true, closed }, { headers: NOINDEX_HEADERS })
  } catch (error) {
    console.error('[cron] Clôture des rémunérations échouée:', error)
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500, headers: NOINDEX_HEADERS },
    )
  }
}
