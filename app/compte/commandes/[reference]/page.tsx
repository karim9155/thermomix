import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, FileText } from 'lucide-react'
import { requireCustomer } from '@/lib/compte/guard'
import { getCustomerOrder } from '@/lib/compte/orders'
import { DeliveryStatusBadge, PaymentStatusBadge, paymentMethodLabel } from '@/components/admin/badges'
import { formatPrice } from '@/lib/product-format'

export async function generateMetadata({ params }: { params: Promise<{ reference: string }> }) {
  const { reference } = await params
  return { title: `Commande ${reference} — INOCASA`, robots: { index: false, follow: false } }
}

const dateTimeFormatter = new Intl.DateTimeFormat('fr-TN', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
})

export default async function CompteCommandePage({
  params,
}: {
  params: Promise<{ reference: string }>
}) {
  const { reference } = await params
  await requireCustomer(`/compte/commandes/${reference}`)

  // RLS filters out orders belonging to anyone else, so "not yours" and
  // "doesn't exist" arrive here identically — and both render a 404, which
  // is what stops this page from confirming that a stranger's reference is
  // real.
  const order = await getCustomerOrder(reference)

  if (!order) {
    notFound()
  }

  return (
    <div className="compte-page">
      <Link href="/compte" className="back-link">
        <ArrowLeft size={16} /> Retour à mon compte
      </Link>

      <div className="compte-detail-heading">
        <div>
          <h1>{order.reference}</h1>
          <p className="compte-email">
            Passée le {dateTimeFormatter.format(new Date(order.createdAt))}
          </p>
        </div>
        <DeliveryStatusBadge status={order.deliveryStatus} />
      </div>

      <div className="compte-detail-grid">
        <section className="compte-card">
          <h2>Articles</h2>
          <table className="compte-table">
            <thead>
              <tr>
                <th>Produit</th>
                <th>Qté</th>
                <th>Prix TTC</th>
                <th>Total</th>
              </tr>
            </thead>
            <tbody>
              {order.items.map((item) => (
                <tr key={item.sku}>
                  <td>
                    <strong>{item.name}</strong>
                    <small>Réf. {item.sku}</small>
                  </td>
                  <td>{item.quantity}</td>
                  <td>{formatPrice(item.priceTTC)}</td>
                  <td>{formatPrice(item.priceTTC * item.quantity)}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="compte-totals">
            <div>
              <span>Sous-total HT</span>
              <strong>{formatPrice(order.subtotalHT)}</strong>
            </div>
            <div>
              <span>TVA 19%</span>
              <strong>{formatPrice(order.totalTVA)}</strong>
            </div>
            <div className="compte-totals-final">
              <span>Total TTC</span>
              <strong>{formatPrice(order.totalTTC)}</strong>
            </div>
          </div>
        </section>

        <aside className="compte-card">
          <h2>Livraison</h2>
          <dl className="compte-def-list">
            <div>
              <dt>Statut</dt>
              <dd>
                <DeliveryStatusBadge status={order.deliveryStatus} />
              </dd>
            </div>
            <div>
              <dt>Délai estimé</dt>
              <dd>{order.estimatedDelivery ?? 'À confirmer'}</dd>
            </div>
            <div>
              <dt>Adresse</dt>
              <dd>
                {order.prenom} {order.nom}
                <br />
                {order.adresse}
                <br />
                {order.ville}, {order.gouvernorat}
                <br />
                {order.telephone}
              </dd>
            </div>
          </dl>

          {/* Invoices exist only once the order has actually been
              delivered. The route re-checks this server-side — hiding the
              button is a courtesy, not the rule. */}
          {order.deliveryStatus === 'livree' ? (
            <a
              className="primary-button full center compte-invoice-button"
              href={`/compte/commandes/${order.reference}/facture`}
            >
              <FileText size={16} /> Télécharger la facture
            </a>
          ) : null}

          <h2 className="compte-card-subheading">Paiement</h2>
          <dl className="compte-def-list">
            <div>
              <dt>Mode</dt>
              <dd>{paymentMethodLabel(order.paymentMethod)}</dd>
            </div>
            <div>
              <dt>Statut</dt>
              <dd>
                <PaymentStatusBadge status={order.status} />
              </dd>
            </div>
          </dl>
        </aside>
      </div>
    </div>
  )
}
