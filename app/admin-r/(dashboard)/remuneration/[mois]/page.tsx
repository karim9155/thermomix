import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ArrowLeft, Download } from 'lucide-react'
import {
  getPeriodAdvisorTotals,
  listEntries,
  monthFromParam,
  paydayOf,
} from '@/lib/conseiller/remuneration'
import { todayInTunis } from '@/lib/conseiller/sales'
import {
  COMMISSION_KIND_LABELS,
  PAYOUT_METHOD_LABELS,
  formatAmount,
  formatMonth,
  type CommissionKind,
} from '@/lib/conseiller/format'
import { formatDay } from '@/components/conseiller/sale-summary'
import { CommissionLines } from '@/components/conseiller/commission-lines'
import { ClosePeriodButton, PayoutControl } from '@/components/admin/remuneration-controls'

export async function generateMetadata({ params }: { params: Promise<{ mois: string }> }) {
  const { mois } = await params
  const month = monthFromParam(mois)
  return { title: month ? `Rémunération ${formatMonth(month)}` : 'Rémunération' }
}

const KINDS: CommissionKind[] = ['vente', 'recrutement', 'challenge', 'ajustement', 'report']

export default async function PeriodePage({
  params,
  searchParams,
}: {
  params: Promise<{ mois: string }>
  searchParams: Promise<{ conseiller?: string }>
}) {
  const [{ mois }, { conseiller }] = await Promise.all([params, searchParams])
  const month = monthFromParam(mois)
  if (!month) notFound()

  const { status, totals } = await getPeriodAdvisorTotals(month)
  if (!status) notFound()

  const selected = totals.find((row) => row.advisorId === conseiller)
  const entries = selected ? await listEntries({ month, advisorId: selected.advisorId }) : []
  const today = todayInTunis()
  const kinds = KINDS.filter((kind) => totals.some((row) => row.byKind[kind]))
  const grandTotal = totals.reduce((sum, row) => sum + row.total, 0)

  return (
    <div className="admin-page">
      <Link href="/admin-r/remuneration" className="back-link">
        <ArrowLeft size={16} /> Retour à la rémunération
      </Link>

      <div className="admin-detail-heading">
        <div>
          <h1 className="advisor-capitalize">{formatMonth(month)}</h1>
          <div className="advisor-heading-meta">
            {status === 'cloturee' ? (
              <span className="admin-badge badge-gray">Clôturé</span>
            ) : (
              <span className="admin-badge badge-blue">Ouvert</span>
            )}
            <span className="admin-muted">Payable le {formatDay(paydayOf(month))}</span>
          </div>
        </div>
        <div className="advisor-control-buttons">
          <a href={`/admin-r/remuneration/${mois}/export`} className="outline-button">
            <Download size={15} /> Exporter (CSV)
          </a>
          {status === 'ouverte' && month < `${today.slice(0, 7)}-01` ? (
            <ClosePeriodButton month={month} label={formatMonth(month)} />
          ) : null}
        </div>
      </div>

      {status === 'ouverte' ? (
        <p className="admin-muted advisor-help">
          Ce mois est encore ouvert : ses montants peuvent évoluer jusqu&apos;à sa clôture, et il ne
          peut pas encore être versé.
        </p>
      ) : null}

      {totals.length === 0 ? (
        <p className="admin-empty">Aucune ligne pour ce mois.</p>
      ) : (
        <div className="admin-table-scroll">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Conseiller</th>
                {kinds.map((kind) => (
                  <th key={kind} className="advisor-num">
                    {COMMISSION_KIND_LABELS[kind]}
                  </th>
                ))}
                <th className="advisor-num">Total</th>
                <th>Versement</th>
              </tr>
            </thead>
            <tbody>
              {totals.map((row) => (
                <tr key={row.advisorId}>
                  <td>
                    <Link
                      href={`/admin-r/remuneration/${mois}?conseiller=${row.advisorId}`}
                      className="admin-table-link"
                    >
                      {row.advisorName}
                    </Link>
                  </td>
                  {kinds.map((kind) => (
                    <td key={kind} className="advisor-num">
                      {row.byKind[kind] ? formatAmount(row.byKind[kind]!) : '—'}
                    </td>
                  ))}
                  <td className="advisor-num">
                    <strong>{formatAmount(row.total)}</strong>
                  </td>
                  <td>
                    {row.payout ? (
                      <div className="advisor-payout-done">
                        <span className="admin-badge badge-green">
                          Versé le {formatDay(row.payout.paidAt)}
                        </span>
                        {row.payout.method ? (
                          <span className="admin-muted">
                            {PAYOUT_METHOD_LABELS[row.payout.method]}
                            {row.payout.reference ? ` · ${row.payout.reference}` : ''}
                          </span>
                        ) : null}
                        <PayoutControl
                          month={month}
                          advisorId={row.advisorId}
                          total={row.total}
                          paid
                          today={today}
                        />
                      </div>
                    ) : status === 'cloturee' ? (
                      <PayoutControl
                        month={month}
                        advisorId={row.advisorId}
                        total={row.total}
                        paid={false}
                        today={today}
                      />
                    ) : (
                      <span className="admin-muted">Après clôture</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr>
                <td>
                  <strong>Total</strong>
                </td>
                {kinds.map((kind) => (
                  <td key={kind} />
                ))}
                <td className="advisor-num">
                  <strong>{formatAmount(grandTotal)}</strong>
                </td>
                <td />
              </tr>
            </tfoot>
          </table>
        </div>
      )}

      {selected ? (
        <section className="admin-card advisor-section-gap">
          <h2>Détail — {selected.advisorName}</h2>
          <CommissionLines entries={entries} orderHref="/admin-r/bons-de-commande" />
        </section>
      ) : null}
    </div>
  )
}
