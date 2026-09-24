import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { hasCriteria, listGradesDetailed } from '@/lib/conseiller/grades'
import { formatAmount } from '@/lib/conseiller/format'
import { GradeArchiveButton, GradeForm } from '@/components/admin/grade-forms'

export const metadata = { title: 'Grades' }

export default async function GradesPage() {
  const grades = await listGradesDetailed()
  const nextRank = Math.max(0, ...grades.map((grade) => grade.rank)) + 1
  const startingRank = grades.find((grade) => !grade.isArchived)?.rank

  return (
    <div className="admin-page">
      <Link href="/admin-r/conseillers" className="back-link">
        <ArrowLeft size={16} /> Retour aux conseillers
      </Link>
      <h1>Grades</h1>
      <p className="admin-muted advisor-help">
        Les critères disent ce qu&apos;il faut atteindre pour accéder à un grade. Un conseiller qui
        les remplit apparaît dans les{' '}
        <Link href="/admin-r/conseillers/promotions" className="admin-table-link">
          promotions proposées
        </Link>{' '}
        ; c&apos;est vous qui validez. Les montants de prime se règlent dans{' '}
        <Link href="/admin-r/remuneration" className="admin-table-link">
          Rémunération
        </Link>
        .
      </p>

      <div className="grade-list">
        {grades.map((grade) => (
          <section key={grade.id} className={`admin-card ${grade.isArchived ? 'admin-row-muted' : ''}`}>
            <div className="admin-section-heading">
              <h2>
                {grade.rank}. {grade.name}
                {grade.isArchived ? <span className="admin-badge badge-gray grade-archived">Archivé</span> : null}
              </h2>
              <GradeArchiveButton gradeId={grade.id} archived={grade.isArchived} />
            </div>
            <p className="admin-muted advisor-help">
              {grade.advisorCount} conseiller{grade.advisorCount > 1 ? 's' : ''} · Critères :{' '}
              {[
                grade.criteria.minRevenue > 0 ? `CA ≥ ${formatAmount(grade.criteria.minRevenue)}` : null,
                grade.criteria.minSales > 0 ? `${grade.criteria.minSales} vente(s)` : null,
                grade.criteria.minRecruits > 0 ? `${grade.criteria.minRecruits} recrue(s)` : null,
              ]
                .filter(Boolean)
                .join(', ') ||
                (grade.rank === startingRank
                  ? 'aucun (grade de départ)'
                  : 'à définir — aucune promotion ne sera proposée vers ce grade')}
              {hasCriteria(grade.criteria) ? ` sur ${grade.criteria.periodMonths} mois` : ''}
            </p>
            <details className="grade-edit">
              <summary>Modifier</summary>
              <GradeForm grade={grade} />
            </details>
          </section>
        ))}
      </div>

      <section className="admin-card advisor-section-gap">
        <h2>Nouveau grade</h2>
        <GradeForm nextRank={nextRank} />
      </section>
    </div>
  )
}
