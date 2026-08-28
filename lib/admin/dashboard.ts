import 'server-only'
import { createAdminClient } from '@/lib/supabase/admin'
import { DELIVERY_STATUSES, type DeliveryStatus, type AdminOrderListItem } from '@/lib/admin/orders'

export type DashboardStats = {
  countsByDeliveryStatus: Record<DeliveryStatus, number>
  totalTTCThisMonth: number
  outOfStockCount: number
}

/**
 * Derives the dashboard's stat cards from an already-loaded order list.
 * The Commandes page renders the cards and the full order table together,
 * so it loads the orders once and passes them in rather than having this
 * re-query them.
 */
export async function getDashboardStats(orders: AdminOrderListItem[]): Promise<DashboardStats> {
  // Started before the synchronous reductions below rather than after, so
  // the one query this function makes overlaps the caller's order fetch
  // instead of waiting behind it. Nothing in the counting depends on it.
  const outOfStockPromise = countOutOfStockProducts()

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

  return {
    countsByDeliveryStatus,
    totalTTCThisMonth,
    outOfStockCount: await outOfStockPromise,
  }
}

async function countOutOfStockProducts(): Promise<number> {
  const supabase = createAdminClient()
  const { count, error } = await supabase
    .from('products')
    .select('*', { count: 'exact', head: true })
    .eq('in_stock', false)
    .eq('is_archived', false)

  if (error) {
    throw new Error(`Impossible de charger les statistiques produits : ${error.message}`)
  }

  return count ?? 0
}
