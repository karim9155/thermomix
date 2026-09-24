import Link from 'next/link'
import { CalendarClock, CheckCircle2, Wallet } from 'lucide-react'
import { requireAdvisorPage } from '@/lib/conseiller/guard'
import {
  listAdvisorMonths,
  listEntries,
  monthFromParam,
  monthParam,
} from '@/lib/conseiller/remuneration'
import { todayInTunis } from '@/lib/conseiller/sales'
import { formatAmount, formatMonth } from '@/lib/conseiller/format'
import { formatDay } from '@/components/conseiller/sale-summary'
import { CommissionLines } from '@/components/conseiller/commission-lines'

export const metadata = { title: 'Ma rémunération' }

export default async function MaRemunerationPage({
  searchParams,
}: {
  searchParams: Promise<{ mois?: string }>
}) {
  const advisor = await requireAdvisorPage()
  const { mois } = await searchParams

  // Always the signed-in advisor's own id, from the guard.
  const months = await listAdvisorMonths(advisor.id)
  const currentMonth = `${todayInTunis().slice(0, 7)}-01`
  const selected = monthFromParam(mois) ?? currentMonth
  const entries = await listEntries({ advisorId: advisor.id, month: selected })

  // G7: running (open month), earned and awaiting payment (closed, not
  // paid), paid.
  const running = months
    .filter((m) => m.status === 'ouverte')
    .reduce((sum, m) => sum + m.total, 0)
  const toBePaid = months
    .filter((m) => m.status === 'cloturee' && !m.payout && m.total > 0)
    .reduce((sum, m) => sum + m.total, 0)
  const paid = months.reduce((sum, m) => sum + (m.payout?.amount ?? 0), 0)

  const selectedInfo = months.find((m) => m.month === selected)

  return (
    <div className="admin-page">
      <h1>Ma rémunération</h1>

      <div className="admin-stat-grid advisor-stat-grid">
        <div className="admin-stat-card">
          <CalendarClock size={20} />
          <strong>{formatAmount(running)}</strong>
          <span>En cours (mois non clôturé)</span>
        </div>
        <div className="admin-stat-card">
          <Wallet size={20} />
          <strong>{formatAmount(toBePaid)}</strong>
          <span>Acquis, à verser</span>
        </div>
        <div className="admin-stat-card">
          <CheckCircle2 size={20} />
          <strong>{formatAmount(paid)}</strong>
          <span>Déjà versé</span>
        </div>
      </div>

      <p className="admin-muted advisor-help">
        Une prime est acquise quand la vente est entièrement payée. Les gains d&apos;un mois vous sont
        versés à partir du 15 du mois suivant.
      </p>

      <div className="admin-detail-grid">
        <section className="admin-card">
          <h2 className="advisor-capitalize">{formatMonth(selected)}</h2>
          {selectedInfo ? (
            <p className="admin-muted advisor-help">
              {selectedInfo.payout
                ? `Versé le ${formatDay(selectedInfo.payout.paidAt)}.`
                : selectedInfo.status === 'cloturee'
                  ? `Clôturé — versement prévu à partir du ${formatDay(selectedInfo.payday)}.`
                  : `Mois en cours — payable à partir du ${formatDay(selectedInfo.payday)}.`}
            </p>
          ) : null}
          <CommissionLines
            entries={entries}
            orderHref="/conseiller/ventes"
            empty="Aucune prime sur ce mois pour le moment."
          />
        </section>

        <aside className="admin-detail-side">
          <section className="admin-card">
            <h2>Historique</h2>
            {months.length === 0 ? (
              <p className="admin-empty">Aucune rémunération pour le moment.</p>
            ) : (
              <ul className="advisor-month-list">
                {months.map((m) => (
                  <li key={m.month} className={m.month === selected ? 'active' : undefined}>
                    <Link href={`/conseiller/remuneration?mois=${monthParam(m.month)}`}>
                      <span className="advisor-capitalize">{formatMonth(m.month)}</span>
                      <strong>{formatAmount(m.total)}</strong>
                    </Link>
                    <span
                      className={`admin-badge ${m.payout ? 'badge-green' : m.status === 'cloturee' ? 'badge-amber' : 'badge-blue'}`}
                    >
                      {m.payout ? 'Versé' : m.status === 'cloturee' ? 'À verser' : 'En cours'}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </aside>
      </div>
    </div>
  )
}
