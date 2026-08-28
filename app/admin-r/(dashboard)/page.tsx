import { PackageX, Truck, Wallet } from 'lucide-react'
import { getDashboardStats } from '@/lib/admin/dashboard'
import { listOrders, DELIVERY_STATUSES } from '@/lib/admin/orders'
import { LivraisonsTable } from '@/components/admin/livraisons-table'
import { formatPrice } from '@/lib/product-format'

export const metadata = { title: 'Commandes' }

const DELIVERY_LABELS: Record<string, string> = {
  en_preparation: 'En préparation',
  en_cours_de_livraison: 'En cours de livraison',
  livree: 'Livrées',
  annulee: 'Annulées',
}

export default async function AdminCommandesPage() {
  const orders = await listOrders()
  // getDashboardStats derives its counts from `orders`, so it genuinely has
  // to wait — but the one query it makes (out-of-stock products) is fired
  // inside it before any of that work, so the two overlap.
  const stats = await getDashboardStats(orders)

  return (
    <div className="admin-page">
      <h1>Commandes</h1>

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

      <LivraisonsTable orders={orders} />
    </div>
  )
}
