import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { evaluateAdvisors } from '@/lib/conseiller/grades'
import { todayInTunis } from '@/lib/conseiller/sales'
import { formatAmount } from '@/lib/conseiller/format'
import { PromoteButton } from '@/components/admin/grade-forms'

export const metadata = { title: 'Promotions proposées' }

export default async function PromotionsPage() {
  const evaluations = await evaluateAdvisors(todayInTunis())
  const proposals = evaluations.filter((entry) => entry.proposed)
  const below = evaluations.filter((entry) => !entry.meetsCurrent && !entry.proposed)

  return (
    <div className="admin-page">
      <Link href="/admin-r/conseillers" className="back-link">
        <ArrowLeft size={16} /> Retour aux conseillers
      </Link>
      <h1>Promotions proposées</h1>
      <p className="admin-muted advisor-help">
        Calculé en direct à partir des ventes entièrement payées et des recrues activées. Rien ne
        change tant que vous ne validez pas.
      </p>

      {proposals.length === 0 ? (
        <p className="admin-empty">Aucun conseiller ne remplit les critères d&apos;un grade supérieur.</p>
      ) : (
        <div className="admin-table-scroll">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Conseiller</th>
                <th>Grade actuel</th>
                <th>Critères atteints pour</th>
                <th className="advisor-num">CA</th>
                <th className="advisor-num">Ventes</th>
                <th className="advisor-num">Recrues</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {proposals.map((entry) => (
                <tr key={entry.advisorId}>
                  <td>
                    <Link href={`/admin-r/conseillers/${entry.advisorId}`} className="admin-table-link">
                      {entry.advisorName}
                    </Link>
                  </td>
                  <td>{entry.currentGrade.name}</td>
                  <td>
                    <strong>{entry.proposed!.name}</strong>
                    <div className="admin-muted advisor-table-sub">
                      sur {entry.proposed!.criteria.periodMonths} mois
                    </div>
                  </td>
                  <td className="advisor-num">{formatAmount(entry.metrics.revenue)}</td>
                  <td className="advisor-num">{entry.metrics.sales}</td>
                  <td className="advisor-num">{entry.metrics.recruits}</td>
                  <td>
                    <PromoteButton
                      advisorId={entry.advisorId}
                      gradeId={entry.proposed!.id}
                      gradeName={entry.proposed!.name}
                      reason={`Critères atteints sur ${entry.proposed!.criteria.periodMonths} mois : CA ${formatAmount(entry.metrics.revenue)}, ${entry.metrics.sales} vente(s), ${entry.metrics.recruits} recrue(s).`}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {below.length > 0 ? (
        <section className="admin-section">
          <h2>Sous les critères de leur grade</h2>
          <p className="admin-muted advisor-help">
            Pour information : ces conseillers ne remplissent plus les critères du grade qu&apos;ils
            occupent. Une rétrogradation se fait depuis leur fiche, avec un motif.
          </p>
          <ul className="advisor-simple-list">
            {below.map((entry) => (
              <li key={entry.advisorId}>
                <Link href={`/admin-r/conseillers/${entry.advisorId}`} className="admin-table-link">
                  {entry.advisorName}
                </Link>
                <span className="admin-muted">
                  {entry.currentGrade.name} · CA {formatAmount(entry.metrics.revenue)} ·{' '}
                  {entry.metrics.sales} vente(s) · {entry.metrics.recruits} recrue(s)
                </span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  )
}
