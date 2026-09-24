import { CalendarDays, ClipboardList, Presentation, TrendingUp, Users } from 'lucide-react'
import { listWorkshops } from '@/lib/conseiller/workshops'
import { todayInTunis } from '@/lib/conseiller/sales'
import { formatMonth } from '@/lib/conseiller/format'
import { WorkshopCalendar } from '@/components/admin/workshop-calendar'
import { WorkshopsTable, formatPercent } from '@/components/conseiller/workshop-display'

export const metadata = { title: 'Ateliers' }

export default async function AteliersPage({
  searchParams,
}: {
  searchParams: Promise<{ mois?: string }>
}) {
  const { mois } = await searchParams
  const today = todayInTunis()
  const month = mois && /^\d{4}-(0[1-9]|1[0-2])$/.test(mois) ? mois : today.slice(0, 7)

  // The month's bounds in Tunis time (UTC+1 all year).
  const [year, mon] = month.split('-').map(Number)
  const next = new Date(Date.UTC(year, mon, 1)).toISOString().slice(0, 7)
  const workshops = await listWorkshops({
    from: `${month}-01T00:00:00+01:00`,
    to: `${next}-01T00:00:00+01:00`,
  })

  const done = workshops.filter((w) => w.status === 'effectue')
  const planned = workshops.filter((w) => w.status === 'planifie')
  const invited = done.reduce((sum, w) => sum + w.invitedCount, 0)
  const attendees = done.reduce((sum, w) => sum + (w.attendeesCount ?? 0), 0)
  const sales = done.reduce((sum, w) => sum + w.salesCount, 0)

  return (
    <div className="admin-page">
      <h1>Ateliers</h1>

      <div className="admin-stat-grid advisor-stat-grid-5">
        <div className="admin-stat-card">
          <CalendarDays size={20} />
          <strong>{planned.length}</strong>
          <span>Planifiés</span>
        </div>
        <div className="admin-stat-card">
          <Presentation size={20} />
          <strong>{done.length}</strong>
          <span>Effectués</span>
        </div>
        <div className="admin-stat-card">
          <Users size={20} />
          <strong>
            {attendees} / {invited}
          </strong>
          <span>Présents / invités</span>
        </div>
        <div className="admin-stat-card">
          <ClipboardList size={20} />
          <strong>{sales}</strong>
          <span>Ventes issues</span>
        </div>
        <div className="admin-stat-card">
          <TrendingUp size={20} />
          <strong>{formatPercent(invited > 0 ? sales / invited : null)}</strong>
          <span>Conversion invités → ventes</span>
        </div>
      </div>

      <WorkshopCalendar month={month} today={today} workshops={workshops} />

      <section className="admin-section">
        <h2 className="advisor-capitalize">Liste — {formatMonth(`${month}-01`)}</h2>
        <WorkshopsTable
          workshops={[...workshops].sort((a, b) => a.scheduledAt.localeCompare(b.scheduledAt))}
          hrefBase="/admin-r/ateliers"
          showAdvisor
        />
      </section>
    </div>
  )
}
