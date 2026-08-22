import { listOrders } from '@/lib/admin/orders'
import { LivraisonsTable } from '@/components/admin/livraisons-table'

export const metadata = { title: 'Livraisons' }

export default async function LivraisonsPage() {
  const orders = await listOrders()

  return (
    <div className="admin-page">
      <h1>Livraisons</h1>
      <LivraisonsTable orders={orders} />
    </div>
  )
}
