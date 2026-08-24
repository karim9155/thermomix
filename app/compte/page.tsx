import type { Metadata } from 'next'
import Link from 'next/link'
import { ArrowRight, LogOut, Package } from 'lucide-react'
import { requireCustomer } from '@/lib/compte/guard'
import { listCustomerOrders } from '@/lib/compte/orders'
import { signout } from '@/app/compte/actions'
import { DeliveryStatusBadge } from '@/components/admin/badges'
import { formatPrice } from '@/lib/product-format'

export const metadata: Metadata = {
  title: 'Mon compte — INOCASA',
  robots: { index: false, follow: false },
}

const dateFormatter = new Intl.DateTimeFormat('fr-TN', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
})

export default async function ComptePage() {
  const customer = await requireCustomer('/compte')
  const orders = await listCustomerOrders()

  return (
    <div className="compte-page">
      <div className="compte-heading">
        <div>
          <p className="eyebrow">INOCASA</p>
          <h1>Mon compte</h1>
          <p className="compte-email">{customer.email}</p>
        </div>
        <form action={signout}>
          <button type="submit" className="outline-button">
            <LogOut size={15} /> Se déconnecter
          </button>
        </form>
      </div>

      <section className="compte-section">
        <h2>Mes commandes</h2>

        {orders.length === 0 ? (
          <div className="compte-empty-state">
            <Package size={26} />
            <p>Vous n&apos;avez pas encore passé de commande.</p>
            <Link href="/boutique" className="primary-button">
              Découvrir la boutique <ArrowRight size={16} />
            </Link>
          </div>
        ) : (
          <ul className="compte-order-list">
            {orders.map((order) => (
              <li key={order.reference}>
                <Link href={`/compte/commandes/${order.reference}`} className="compte-order-card">
                  <div className="compte-order-main">
                    <strong>{order.reference}</strong>
                    <span>{dateFormatter.format(new Date(order.createdAt))}</span>
                  </div>

                  <div className="compte-order-status">
                    <DeliveryStatusBadge status={order.deliveryStatus} />
                    {order.estimatedDelivery ? (
                      <span className="compte-order-estimate">
                        Livraison estimée : {order.estimatedDelivery}
                      </span>
                    ) : null}
                  </div>

                  <div className="compte-order-total">
                    <strong>{formatPrice(order.totalTTC)}</strong>
                    <ArrowRight size={16} />
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}
