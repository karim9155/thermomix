import Link from 'next/link'
import { listPeriodSummaries, listRules, monthParam } from '@/lib/conseiller/remuneration'
import { listAdvisors, listGrades } from '@/lib/conseiller/network'
import { todayInTunis } from '@/lib/conseiller/sales'
import { formatAmount, formatMonth } from '@/lib/conseiller/format'
import { formatDay } from '@/components/conseiller/sale-summary'
import {
  AdjustmentForm,
  ClosePeriodButton,
  RuleForm,
} from '@/components/admin/remuneration-controls'

export const metadata = { title: 'Rémunération' }

export default async function RemunerationPage() {
  const [periods, rules, grades, advisors] = await Promise.all([
    listPeriodSummaries(),
    listRules(),
    listGrades(),
    listAdvisors(),
  ])
  const today = todayInTunis()
  const currentMonth = `${today.slice(0, 7)}-01`

  // The rule in force today per grade, and the next one if scheduled.
  const inForce = new Map<string, (typeof rules)[number]>()
  const upcoming = new Map<string, (typeof rules)[number]>()
  for (const rule of rules) {
    if (rule.effectiveFrom <= today) {
      if (!inForce.has(rule.gradeId)) inForce.set(rule.gradeId, rule)
    } else {
      const known = upcoming.get(rule.gradeId)
      if (!known || rule.effectiveFrom < known.effectiveFrom) upcoming.set(rule.gradeId, rule)
    }
  }

  return (
    <div className="admin-page">
      <h1>Rémunération</h1>

      <section className="admin-section advisor-first-section">
        <h2>Mois</h2>
        <p className="admin-muted advisor-help">
          Les gains d&apos;un mois sont versés le 15 du mois suivant : le mois est alors clôturé
          automatiquement et verrouillé. Vous pouvez aussi clôturer un mois terminé à la main.
        </p>
        {periods.length === 0 ? (
          <p className="admin-empty">Aucune rémunération pour le moment.</p>
        ) : (
          <div className="admin-table-scroll">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Mois</th>
                  <th>Statut</th>
                  <th>Payable le</th>
                  <th className="advisor-num">Total</th>
                  <th>Versements</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {periods.map((period) => (
                  <tr key={period.month}>
                    <td>
                      <Link
                        href={`/admin-r/remuneration/${monthParam(period.month)}`}
                        className="admin-table-link advisor-capitalize"
                      >
                        {formatMonth(period.month)}
                      </Link>
                    </td>
                    <td>
                      {period.status === 'cloturee' ? (
                        <span className="admin-badge badge-gray">Clôturé</span>
                      ) : period.month === currentMonth ? (
                        <span className="admin-badge badge-blue">En cours</span>
                      ) : (
                        <span className="admin-badge badge-amber">À clôturer</span>
                      )}
                    </td>
                    <td>{formatDay(period.payday)}</td>
                    <td className="advisor-num">{formatAmount(period.total)}</td>
                    <td>
                      {period.status === 'cloturee'
                        ? `${period.paidCount} / ${period.advisorCount} versé${period.paidCount > 1 ? 's' : ''}`
                        : '—'}
                    </td>
                    <td>
                      {period.status === 'ouverte' && period.month < currentMonth ? (
                        <ClosePeriodButton month={period.month} label={formatMonth(period.month)} />
                      ) : null}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <div className="advisor-two-columns">
        <section className="admin-card">
          <h2>Montants par grade</h2>
          <div className="admin-table-scroll advisor-card-gap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Grade</th>
                  <th className="advisor-num">Par Thermomix</th>
                  <th className="advisor-num">Recrutement</th>
                  <th>Depuis</th>
                </tr>
              </thead>
              <tbody>
                {grades.map((grade) => {
                  const rule = inForce.get(grade.id)
                  const next = upcoming.get(grade.id)
                  return (
                    <tr key={grade.id}>
                      <td>
                        {grade.name}
                        {next ? (
                          <div className="admin-muted advisor-table-sub">
                            Le {formatDay(next.effectiveFrom)} : {formatAmount(next.robotSaleBonus)} /{' '}
                            {formatAmount(next.recruitmentBonus)}
                          </div>
                        ) : null}
                      </td>
                      <td className="advisor-num">{rule ? formatAmount(rule.robotSaleBonus) : 'Non défini'}</td>
                      <td className="advisor-num">{rule ? formatAmount(rule.recruitmentBonus) : 'Non défini'}</td>
                      <td>{rule ? formatDay(rule.effectiveFrom) : '—'}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
          <h3 className="advisor-subheading">Modifier</h3>
          <p className="admin-muted advisor-help">
            Les ventes déjà payées gardent le montant en vigueur au jour de leur paiement.
          </p>
          <RuleForm
            grades={grades}
            current={Object.fromEntries(
              [...inForce.entries()].map(([gradeId, rule]) => [
                gradeId,
                { robotSaleBonus: rule.robotSaleBonus, recruitmentBonus: rule.recruitmentBonus },
              ]),
            )}
            today={today}
          />
        </section>

        <section className="admin-card">
          <h2>Ajustement manuel</h2>
          <p className="admin-muted advisor-help">
            Bonus exceptionnel ou retenue, ajouté au mois en cours et visible par le conseiller
            avec son motif.
          </p>
          <AdjustmentForm
            advisors={advisors
              .filter((advisor) => advisor.status !== 'invite')
              .map((advisor) => ({ id: advisor.id, name: `${advisor.prenom} ${advisor.nom}` }))}
          />
        </section>
      </div>
    </div>
  )
}
