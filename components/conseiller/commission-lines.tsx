import Link from 'next/link'
import {
  COMMISSION_KIND_LABELS,
  formatAmount,
  type CommissionEntry,
} from '@/lib/conseiller/format'
import { formatDay } from '@/components/conseiller/sale-summary'

/**
 * Ledger lines, one per gain or correction (G5). Server Component shared
 * by the admin and the advisor; `orderHref` turns a sale reference into a
 * link on the side that has a page for it. Only sale lines link: a
 * recruitment bonus points at the RECRUIT's sale, which the sponsor has
 * no page for.
 */
export function CommissionLines({
  entries,
  orderHref,
  empty = 'Aucune ligne pour le moment.',
}: {
  entries: CommissionEntry[]
  orderHref?: string
  empty?: string
}) {
  if (entries.length === 0) return <p className="admin-empty">{empty}</p>

  const total = entries.reduce((sum, entry) => sum + entry.amount, 0)

  return (
    <>
      <div className="admin-table-scroll">
        <table className="admin-table">
          <thead>
            <tr>
              <th>Date</th>
              <th>Type</th>
              <th>Détail</th>
              <th className="advisor-num">Montant</th>
            </tr>
          </thead>
          <tbody>
            {entries.map((entry) => (
              <tr key={entry.id}>
                <td>{formatDay(entry.eventDate)}</td>
                <td>{COMMISSION_KIND_LABELS[entry.kind]}</td>
                <td>
                  {entry.label}
                  {entry.orderReference && orderHref && entry.kind === 'vente' ? (
                    <>
                      {' · '}
                      <Link href={`${orderHref}/${entry.orderReference}`} className="admin-table-link">
                        {entry.orderReference}
                      </Link>
                    </>
                  ) : null}
                </td>
                <td className={`advisor-num ${entry.amount < 0 ? 'advisor-negative' : ''}`}>
                  {formatAmount(entry.amount, true)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="admin-totals">
        <div className="admin-totals-final">
          <span>Total</span>
          <strong>{formatAmount(total)}</strong>
        </div>
      </div>
    </>
  )
}
