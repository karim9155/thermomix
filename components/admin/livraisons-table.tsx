'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { Search } from 'lucide-react'
import type { AdminOrderListItem } from '@/lib/admin/orders'
import {
  DELIVERY_STATUSES,
  formatEstimatedDelivery,
  type DeliveryStatus,
} from '@/lib/admin/order-format'
import { DeliveryStatusBadge, PaymentStatusBadge, paymentMethodLabel } from '@/components/admin/badges'
import { formatPrice } from '@/lib/product-format'

type Tab = 'toutes' | DeliveryStatus

const TAB_LABELS: Record<Tab, string> = {
  toutes: 'Toutes',
  en_preparation: 'En préparation',
  en_cours_de_livraison: 'En cours de livraison',
  livree: 'Livrées',
  annulee: 'Annulées',
}

const TABS: Tab[] = ['toutes', ...DELIVERY_STATUSES]

const dateFormatter = new Intl.DateTimeFormat('fr-TN', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
})

export function LivraisonsTable({ orders }: { orders: AdminOrderListItem[] }) {
  const [tab, setTab] = useState<Tab>('toutes')
  const [query, setQuery] = useState('')

  const counts = useMemo(() => {
    const counts: Record<Tab, number> = {
      toutes: orders.length,
      en_preparation: 0,
      en_cours_de_livraison: 0,
      livree: 0,
      annulee: 0,
    }
    for (const order of orders) {
      counts[order.deliveryStatus]++
    }
    return counts
  }, [orders])

  const visible = useMemo(() => {
    const term = query.trim().toLowerCase()
    return orders.filter((order) => {
      if (tab !== 'toutes' && order.deliveryStatus !== tab) return false
      if (!term) return true
      return (
        order.reference.toLowerCase().includes(term) ||
        order.nom.toLowerCase().includes(term) ||
        order.prenom.toLowerCase().includes(term) ||
        order.telephone.toLowerCase().includes(term)
      )
    })
  }, [orders, tab, query])

  return (
    <div>
      <div className="admin-filter-row">
        <div className="admin-tabs">
          {TABS.map((t) => (
            <button
              key={t}
              type="button"
              className={t === tab ? 'admin-tab active' : 'admin-tab'}
              onClick={() => setTab(t)}
            >
              {TAB_LABELS[t]} <span className="admin-tab-count">{counts[t]}</span>
            </button>
          ))}
        </div>
        <div className="admin-search">
          <Search size={16} />
          <input
            placeholder="Référence, nom ou téléphone"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
        </div>
      </div>

      {visible.length === 0 ? (
        <p className="admin-empty">Aucune commande ne correspond.</p>
      ) : (
        /* Wrapper, not the table itself: a table cannot scroll on its own,
           so on a narrow screen nine columns simply overflowed the page.
           The wrapper scrolls and the table keeps its layout. */
        <div className="admin-table-scroll">
          <table className="admin-table">
          <thead>
            <tr>
              <th>Référence</th>
              <th>Date</th>
              <th>Client</th>
              <th>Téléphone</th>
              <th>Ville</th>
              <th>Total TTC</th>
              <th>Paiement</th>
              <th>Livraison</th>
              <th>Délai estimé</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {visible.map((order) => (
              <tr key={order.reference}>
                <td>
                  <Link
                    href={`/admin-r/livraisons/${order.reference}`}
                    className="admin-table-link admin-table-row-link"
                  >
                    {order.reference}
                  </Link>
                </td>
                <td>{dateFormatter.format(new Date(order.createdAt))}</td>
                <td>
                  {order.prenom} {order.nom}
                </td>
                <td>{order.telephone}</td>
                <td>{order.ville}</td>
                <td>{formatPrice(order.totalTTC)}</td>
                <td>
                  <div className="admin-payment-cell">
                    <span>{paymentMethodLabel(order.paymentMethod)}</span>
                    <PaymentStatusBadge status={order.status} />
                  </div>
                </td>
                <td>
                  <DeliveryStatusBadge status={order.deliveryStatus} />
                </td>
                <td>
                  {formatEstimatedDelivery(order.estimatedDelivery) ?? (
                    <span className="admin-muted">—</span>
                  )}
                </td>
                <td>
                  <Link href={`/admin-r/livraisons/${order.reference}`} className="admin-table-link">
                    Voir
                  </Link>
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
