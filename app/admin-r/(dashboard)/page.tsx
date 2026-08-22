import Link from 'next/link'
import { ArrowRight, PackageX, Truck, Wallet } from 'lucide-react'
import { getDashboardStats } from '@/lib/admin/dashboard'
import { DELIVERY_STATUSES } from '@/lib/admin/orders'
import { DeliveryStatusBadge } from '@/components/admin/badges'
import { formatPrice } from '@/lib/product-format'

export const metadata = { title: 'Tableau de bord' }

const DELIVERY_LABELS: Record<string, string> = {
  en_preparation: 'En préparation',
  en_cours_de_livraison: 'En cours de livraison',
  livree: 'Livrées',
  annulee: 'Annulées',
}

export default async function AdminDashboardPage() {
  const stats = await getDashboardStats()

  return (
    <div className="admin-page">
      <h1>Tableau de bord</h1>

      <div className="admin-stat-grid">
        {DELIVERY_STATUSES.map((status) => (
          <div className="admin-stat-card" key={status}>
            <Truck size={20} />
            <strong>{stats.countsByDeliveryStatus[status]}</strong>
            <span>{DELIVERY_LABELS[status]}</span>
          </div>
        ))}
        <div className="admin-stat-card">
          <Wallet size={20} />
          <strong>{formatPrice(stats.totalTTCThisMonth)}</strong>
          <span>Total TTC ce mois-ci</span>
        </div>
        <div className="admin-stat-card">
          <PackageX size={20} />
          <strong>{stats.outOfStockCount}</strong>
          <span>Produits en rupture</span>
        </div>
      </div>

      <section className="admin-section">
        <div className="admin-section-heading">
          <h2>Commandes récentes</h2>
          <Link href="/admin-r/livraisons" className="text-link">
            Voir toutes les livraisons <ArrowRight size={16} />
          </Link>
        </div>

        {stats.recentOrders.length === 0 ? (
          <p className="admin-empty">Aucune commande pour le moment.</p>
        ) : (
          <table className="admin-table">
            <thead>
              <tr>
                <th>Référence</th>
                <th>Client</th>
                <th>Ville</th>
                <th>Total TTC</th>
                <th>Livraison</th>
              </tr>
            </thead>
            <tbody>
              {stats.recentOrders.map((order) => (
                <tr key={order.reference}>
                  <td>
                    <Link href={`/admin-r/livraisons/${order.reference}`} className="admin-table-link">
                      {order.reference}
                    </Link>
                  </td>
                  <td>
                    {order.prenom} {order.nom}
                  </td>
                  <td>{order.ville}</td>
                  <td>{formatPrice(order.totalTTC)}</td>
                  <td>
                    <DeliveryStatusBadge status={order.deliveryStatus} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </div>
  )
}
