import Link from 'next/link'
import { CalendarPlus, ClipboardList, Presentation, TrendingUp } from 'lucide-react'
import { requireAdvisorPage } from '@/lib/conseiller/guard'
import { listWorkshops } from '@/lib/conseiller/workshops'
import { WorkshopsTable, formatPercent } from '@/components/conseiller/workshop-display'

export const metadata = { title: 'Mes ateliers' }

export default async function MesAteliersPage() {
  const advisor = await requireAdvisorPage()
  const workshops = await listWorkshops({ advisorId: advisor.id })
  const now = new Date().toISOString()

  const upcoming = workshops
    .filter((w) => w.status === 'planifie' && w.scheduledAt > now)
    .sort((a, b) => a.scheduledAt.localeCompare(b.scheduledAt))
  const toReport = workshops.filter((w) => w.status === 'planifie' && w.scheduledAt <= now)
  const history = workshops.filter((w) => w.status !== 'planifie')

  const done = workshops.filter((w) => w.status === 'effectue')
  const invited = done.reduce((sum, w) => sum + w.invitedCount, 0)
  const sales = done.reduce((sum, w) => sum + w.salesCount, 0)

  return (
    <div className="admin-page">
      <div className="admin-section-heading">
        <h1>Mes ateliers</h1>
        <Link href="/conseiller/ateliers/nouveau" className="primary-button">
          <CalendarPlus size={17} /> Planifier un atelier
        </Link>
      </div>

      <div className="admin-stat-grid advisor-stat-grid">
        <div className="admin-stat-card">
          <Presentation size={20} />
          <strong>{done.length}</strong>
          <span>Ateliers effectués</span>
        </div>
        <div className="admin-stat-card">
          <ClipboardList size={20} />
          <strong>{sales}</strong>
          <span>Ventes issues de mes ateliers</span>
        </div>
        <div className="admin-stat-card">
          <TrendingUp size={20} />
          <strong>{formatPercent(invited > 0 ? sales / invited : null)}</strong>
          <span>Conversion invités → ventes</span>
        </div>
      </div>

      {toReport.length > 0 ? (
        <section className="admin-section advisor-first-section">
          <h2>Rapport à saisir ({toReport.length})</h2>
          <WorkshopsTable workshops={toReport} hrefBase="/conseiller/ateliers" />
        </section>
      ) : null}

      <section className="admin-section">
        <h2>À venir</h2>
        <WorkshopsTable workshops={upcoming} hrefBase="/conseiller/ateliers" />
      </section>

      <section className="admin-section">
        <h2>Historique</h2>
        <WorkshopsTable workshops={history} hrefBase="/conseiller/ateliers" />
      </section>
    </div>
  )
}
