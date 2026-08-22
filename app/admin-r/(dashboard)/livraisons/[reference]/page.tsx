import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Phone } from 'lucide-react'
import { getOrderDetail } from '@/lib/admin/orders'
import { PaymentStatusBadge, paymentMethodLabel } from '@/components/admin/badges'
import { DeliveryStatusControl } from '@/components/admin/delivery-status-control'
import { formatPrice } from '@/lib/product-format'

export async function generateMetadata({ params }: { params: Promise<{ reference: string }> }) {
  const { reference } = await params
  return { title: reference }
}

const dateTimeFormatter = new Intl.DateTimeFormat('fr-TN', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
})

const HISTORY_LABELS: Record<string, string> = {
  en_preparation: 'En préparation',
  en_cours_de_livraison: 'En cours de livraison',
  livree: 'Livrée',
  annulee: 'Annulée',
}

export default async function LivraisonDetailPage({
  params,
}: {
  params: Promise<{ reference: string }>
}) {
  const { reference } = await params
  const order = await getOrderDetail(reference)

  if (!order) {
    notFound()
  }

  return (
    <div className="admin-page">
      <Link href="/admin-r/livraisons" className="back-link">
        <ArrowLeft size={16} /> Retour aux livraisons
      </Link>

      <div className="admin-detail-heading">
        <h1>{order.reference}</h1>
        <DeliveryStatusControl reference={order.reference} currentStatus={order.deliveryStatus} />
      </div>

      <div className="admin-detail-grid">
        <div className="admin-detail-main">
          <section className="admin-card">
            <h2>Client</h2>
            <dl className="admin-def-list">
              <div>
                <dt>Nom</dt>
                <dd>
                  {order.prenom} {order.nom}
                </dd>
              </div>
              <div>
                <dt>Téléphone</dt>
                <dd>
                  <a href={`tel:${order.telephone}`}>{order.telephone}</a>
                </dd>
              </div>
              {order.email ? (
                <div>
                  <dt>Email</dt>
                  <dd>
                    <a href={`mailto:${order.email}`}>{order.email}</a>
                  </dd>
                </div>
              ) : null}
              <div>
                <dt>Adresse</dt>
                <dd>
                  {order.adresse}, {order.ville}, {order.gouvernorat}
                </dd>
              </div>
              {order.notes ? (
                <div>
                  <dt>Notes</dt>
                  <dd>{order.notes}</dd>
                </div>
              ) : null}
              <div>
                <dt>Passée le</dt>
                <dd>{dateTimeFormatter.format(new Date(order.createdAt))}</dd>
              </div>
            </dl>
          </section>

          <section className="admin-card">
            <h2>Articles</h2>
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Produit</th>
                  <th>Réf.</th>
                  <th>Qté</th>
                  <th>Prix TTC</th>
                  <th>Total</th>
                </tr>
              </thead>
              <tbody>
                {order.items.map((item) => (
                  <tr key={item.sku}>
                    <td>{item.name}</td>
                    <td>{item.sku}</td>
                    <td>{item.quantity}</td>
                    <td>{formatPrice(item.priceTTC)}</td>
                    <td>{formatPrice(item.priceTTC * item.quantity)}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div className="admin-totals">
              <div>
                <span>Sous-total HT</span>
                <strong>{formatPrice(order.subtotalHT)}</strong>
              </div>
              <div>
                <span>TVA</span>
                <strong>{formatPrice(order.totalTVA)}</strong>
              </div>
              <div className="admin-totals-final">
                <span>Total TTC</span>
                <strong>{formatPrice(order.totalTTC)}</strong>
              </div>
            </div>
          </section>

          <section className="admin-card">
            <h2>Historique des statuts</h2>
            {order.history.length === 0 ? (
              <p className="admin-empty">Aucun changement de statut enregistré.</p>
            ) : (
              <ul className="admin-timeline">
                {order.history.map((entry) => (
                  <li key={entry.id}>
                    <div className="admin-timeline-dot" />
                    <div>
                      <strong>
                        {entry.fromStatus
                          ? `${HISTORY_LABELS[entry.fromStatus] ?? entry.fromStatus} → ${HISTORY_LABELS[entry.toStatus] ?? entry.toStatus}`
                          : (HISTORY_LABELS[entry.toStatus] ?? entry.toStatus)}
                      </strong>
                      <span>
                        {dateTimeFormatter.format(new Date(entry.changedAt))}
                        {entry.changedByEmail ? ` · ${entry.changedByEmail}` : ''}
                      </span>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>

        <aside className="admin-card admin-detail-side">
          <h2>Paiement</h2>
          <dl className="admin-def-list">
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
          <a href={`tel:${order.telephone}`} className="outline-button full center">
            <Phone size={16} /> Appeler le client
          </a>
        </aside>
      </div>
    </div>
  )
}
