import { formatAmount } from '@/lib/conseiller/format'
import type { GradeProgress } from '@/lib/conseiller/grades'
import { formatDay } from '@/components/conseiller/sale-summary'

/**
 * An advisor's grade and how far they are from the next one (F7). Only
 * the criteria the next grade actually sets are shown.
 */
export function GradeProgressCard({ progress }: { progress: GradeProgress }) {
  const { current, next, metrics, windowFrom } = progress

  if (!next) {
    return (
      <section className="admin-card">
        <h2>Mon grade : {current?.name ?? '—'}</h2>
        <p className="admin-muted advisor-help">Vous avez atteint le grade le plus élevé. Bravo !</p>
      </section>
    )
  }

  const rows = [
    {
      label: "Chiffre d'affaires",
      value: metrics.revenue,
      goal: next.criteria.minRevenue,
      format: (value: number) => formatAmount(value),
    },
    { label: 'Ventes', value: metrics.sales, goal: next.criteria.minSales, format: String },
    { label: 'Recrues activées', value: metrics.recruits, goal: next.criteria.minRecruits, format: String },
  ].filter((row) => row.goal > 0)

  // No criteria means the admin hasn't set them yet — not "reached".
  const reached = rows.length > 0 && rows.every((row) => row.value >= row.goal)

  return (
    <section className="admin-card">
      <h2>Mon grade : {current?.name ?? '—'}</h2>
      <p className="admin-muted advisor-help">
        Prochain grade : <strong>{next.name}</strong> — calculé depuis le {formatDay(windowFrom)} (
        {next.criteria.periodMonths} derniers mois).
      </p>

      {rows.length === 0 ? (
        <p className="admin-muted advisor-help">
          Les critères de ce grade n&apos;ont pas encore été fixés par l&apos;administration.
        </p>
      ) : (
        <ul className="advisor-progress-list">
          {rows.map((row) => {
            const percent = Math.min(100, Math.round((row.value / row.goal) * 100))
            return (
              <li key={row.label}>
                <div className="advisor-progress-head">
                  <span>{row.label}</span>
                  <strong>
                    {row.format(row.value)} / {row.format(row.goal)}
                  </strong>
                </div>
                <div className="advisor-progress-bar" aria-hidden="true">
                  <span style={{ width: `${percent}%` }} />
                </div>
              </li>
            )
          })}
        </ul>
      )}

      {reached ? (
        <p className="advisor-code-ok">Objectifs atteints : l&apos;administration va valider votre promotion.</p>
      ) : null}
    </section>
  )
}
