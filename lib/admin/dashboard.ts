import 'server-only'
import { createAdminClient } from '@/lib/supabase/admin'
import { listOrders, DELIVERY_STATUSES, type DeliveryStatus, type AdminOrderListItem } from '@/lib/admin/orders'

export type DashboardStats = {
  countsByDeliveryStatus: Record<DeliveryStatus, number>
  totalTTCThisMonth: number
  outOfStockCount: number
  recentOrders: AdminOrderListItem[]
}

export async function getDashboardStats(): Promise<DashboardStats> {
  const orders = await listOrders()

  const countsByDeliveryStatus = Object.fromEntries(
    DELIVERY_STATUSES.map((status) => [
      status,
      orders.filter((order) => order.deliveryStatus === status).length,
    ]),
  ) as Record<DeliveryStatus, number>

  const now = new Date()
  const totalTTCThisMonth = orders
    .filter((order) => {
      const created = new Date(order.createdAt)
      return created.getFullYear() === now.getFullYear() && created.getMonth() === now.getMonth()
    })
    .reduce((sum, order) => sum + order.totalTTC, 0)

  const supabase = createAdminClient()
  const { count: outOfStockCount, error } = await supabase
    .from('products')
    .select('*', { count: 'exact', head: true })
    .eq('in_stock', false)
    .eq('is_archived', false)

  if (error) {
    throw new Error(`Impossible de charger les statistiques produits : ${error.message}`)
  }

  return {
    countsByDeliveryStatus,
    totalTTCThisMonth,
    outOfStockCount: outOfStockCount ?? 0,
    recentOrders: orders.slice(0, 5),
  }
}
