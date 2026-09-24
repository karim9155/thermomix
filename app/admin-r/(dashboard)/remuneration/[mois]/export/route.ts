import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin/guard'
import { monthFromParam, periodCsv } from '@/lib/conseiller/remuneration'

export const dynamic = 'force-dynamic'

/** The month's payroll as a CSV download (G14). Admin only. */
export async function GET(_request: Request, { params }: { params: Promise<{ mois: string }> }) {
  try {
    await requireAdmin()
  } catch {
    return NextResponse.json({ error: 'Accès refusé.' }, { status: 403 })
  }

  const { mois } = await params
  const month = monthFromParam(mois)
  if (!month) {
    return NextResponse.json({ error: 'Mois invalide.' }, { status: 400 })
  }

  const csv = await periodCsv(month)
  return new NextResponse(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="remuneration-${mois}.csv"`,
      'Cache-Control': 'no-store',
    },
  })
}
