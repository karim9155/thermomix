import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// Never cached or prerendered — a keepalive that could be served from
// cache would defeat the entire point of this route.
export const dynamic = 'force-dynamic'

// Kept off search/crawl surfaces even though nothing links here; belt and
// braces alongside the Authorization check below.
const NOINDEX_HEADERS = { 'X-Robots-Tag': 'noindex' }

/**
 * Pings Postgres so the Supabase free-tier project doesn't auto-pause
 * after 7 days of database inactivity.
 *
 * Ordinary site traffic doesn't prevent that: /boutique and
 * /boutique/[slug] are ISR with `revalidate = 300`, so most requests are
 * served from Next's cache and never touch the database — the site can
 * look perfectly alive while Supabase still counts seven quiet days.
 * This route exists specifically to make sure something does touch it.
 *
 * Called by Vercel Cron on the schedule in vercel.json, which sends
 * `Authorization: Bearer <CRON_SECRET>` automatically. Anything else is
 * rejected before the query runs. Uses the publishable key, not the
 * secret key — `products` has a public read policy, so this needs no
 * privileged access.
 */
export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json(
      { ok: false, error: 'Unauthorized' },
      { status: 401, headers: NOINDEX_HEADERS },
    )
  }

  try {
    const supabase = await createClient()
    const { error } = await supabase.from('products').select('sku').limit(1)

    if (error) {
      return NextResponse.json(
        { ok: false, error: error.message },
        { status: 500, headers: NOINDEX_HEADERS },
      )
    }

    return NextResponse.json(
      { ok: true, at: new Date().toISOString() },
      { headers: NOINDEX_HEADERS },
    )
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500, headers: NOINDEX_HEADERS },
    )
  }
}
