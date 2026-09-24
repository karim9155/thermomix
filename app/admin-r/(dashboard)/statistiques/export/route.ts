import { NextResponse, type NextRequest } from 'next/server'
import { requireAdmin } from '@/lib/admin/guard'
import { todayInTunis } from '@/lib/conseiller/sales'
import {
  getLeaderboard,
  leaderboardCsv,
  parsePeriod,
  profilesCsv,
  regionsCsv,
  statsByClientProfile,
  statsByRegion,
} from '@/lib/conseiller/stats'

export const dynamic = 'force-dynamic'

/** Statistics as CSV for a period (J11): ?type=classement|regions|profils&du=&au=. Admin only. */
export async function GET(request: NextRequest) {
  try {
    await requireAdmin()
  } catch {
    return NextResponse.json({ error: 'Accès refusé.' }, { status: 403 })
  }

  const params = request.nextUrl.searchParams
  const today = todayInTunis()
  const period = parsePeriod({ du: params.get('du') ?? undefined, au: params.get('au') ?? undefined }, today)
  const type = params.get('type')

  let body: string
  if (type === 'classement') {
    body = leaderboardCsv(await getLeaderboard(period))
  } else if (type === 'regions') {
    body = regionsCsv(statsByRegion(await getLeaderboard(period)))
  } else if (type === 'profils') {
    body = profilesCsv(await statsByClientProfile(period, today))
  } else {
    return NextResponse.json({ error: 'Type inconnu.' }, { status: 400 })
  }

  return new NextResponse(body, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${type}-${period.from}_${period.to}.csv"`,
      'Cache-Control': 'no-store',
    },
  })
}
