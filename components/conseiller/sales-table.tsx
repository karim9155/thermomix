'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { Search } from 'lucide-react'
import { formatPrice } from '@/lib/product-format'
import {
  SALE_STATUS_LABELS,
  dateFormatter,
  installmentCountLabel,
  type SaleListItem,
  type SaleStatus,
} from '@/lib/conseiller/format'
import { LateBadge, SaleStatusBadge } from '@/components/conseiller/badges'

type Tab = 'tous' | 'en_retard' | SaleStatus

/**
 * Order-form list for both sides. The admin sees every advisor's forms
 * (never drafts) with an advisor column; an advisor sees their own,
 * drafts included. `hrefBase` is where a row links to.
 */
export function SalesTable({
  sales,
  hrefBase,
  statuses,
  showAdvisor = false,
}: {
  sales: SaleListItem[]
  hrefBase: string
  statuses: SaleStatus[]
  showAdvisor?: boolean
}) {
  const tabs: Tab[] = ['tous', ...statuses, 'en_retard']
  const [tab, setTab] = useState<Tab>('tous')
  const [query, setQuery] = useState('')

  const counts = useMemo(() => {
    const counts = new Map<Tab, number>([['tous', sales.length]])
    for (const sale of sales) {
      counts.set(sale.saleStatus, (counts.get(sale.saleStatus) ?? 0) + 1)
      if (sale.hasLateInstallment) counts.set('en_retard', (counts.get('en_retard') ?? 0) + 1)
    }
    return counts
  }, [sales])

  const visible = useMemo(() => {
    const term = query.trim().toLowerCase()
    return sales.filter((sale) => {
      if (tab === 'en_retard' && !sale.hasLateInstallment) return false
      if (tab !== 'tous' && tab !== 'en_retard' && sale.saleStatus !== tab) return false
      if (!term) return true
      return [sale.reference, sale.clientName, sale.advisorName].join(' ').toLowerCase().includes(term)
    })
  }, [sales, tab, query])

  return (
    <div>
      <div className="admin-filter-row">
        <div className="admin-tabs">
          {tabs.map((t) => (
            <button
              key={t}
              type="button"
              className={t === tab ? 'admin-tab active' : 'admin-tab'}
              onClick={() => setTab(t)}
            >
              {t === 'tous' ? 'Tous' : t === 'en_retard' ? 'En retard' : SALE_STATUS_LABELS[t]}{' '}
              <span className="admin-tab-count">{counts.get(t) ?? 0}</span>
            </button>
          ))}
        </div>
        <div className="admin-search">
          <Search size={16} />
          <input
            placeholder={showAdvisor ? 'Référence, client ou conseiller' : 'Référence ou client'}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
        </div>
      </div>

      {visible.length === 0 ? (
        <p className="admin-empty">Aucun bon de commande ne correspond.</p>
      ) : (
        <div className="admin-table-scroll">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Référence</th>
                <th>Date</th>
                <th>Client</th>
                {showAdvisor ? <th>Conseiller</th> : null}
                <th>Total</th>
                <th>Paiement</th>
                <th>Encaissé</th>
                <th>Statut</th>
              </tr>
            </thead>
            <tbody>
              {visible.map((sale) => (
                <tr key={sale.reference}>
                  <td>
                    <Link href={`${hrefBase}/${sale.reference}`} className="admin-table-link">
                      {sale.reference}
                    </Link>
                  </td>
                  <td>{dateFormatter.format(new Date(sale.submittedAt ?? sale.createdAt))}</td>
                  <td>{sale.clientName}</td>
                  {showAdvisor ? <td>{sale.advisorName}</td> : null}
                  <td>{formatPrice(sale.totalDue)}</td>
                  <td>{installmentCountLabel(sale.installmentCount)}</td>
                  <td>{formatPrice(sale.paidAmount)}</td>
                  <td>
                    <div className="advisor-badge-row">
                      <SaleStatusBadge status={sale.saleStatus} />
                      {sale.hasLateInstallment ? <LateBadge /> : null}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
