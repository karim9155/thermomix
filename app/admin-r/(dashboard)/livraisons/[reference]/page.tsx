import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Phone } from 'lucide-react'
import { getOrderDetail } from '@/lib/admin/orders'
import { PaymentStatusBadge, paymentMethodLabel } from '@/components/admin/badges'
import { DeliveryStatusControl } from '@/components/admin/delivery-status-control'
import { EstimatedDeliveryControl } from '@/components/admin/estimated-delivery-control'
import { InvoiceUploadControl } from '@/components/admin/invoice-upload-control'
import { parseEstimatedDeliveryEvent, formatEstimatedDelivery } from '@/lib/admin/order-format'
import { formatPrice, formatPriceHT } from '@/lib/product-format'

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

/**
 * The history table carries two kinds of row: delivery_status transitions
 * and delivery-estimate changes (tagged with ESTIMATED_DELIVERY_EVENT).
 * Estimates are free text, so they never match HISTORY_LABELS — read them
 * back through the parser instead of showing the raw stored string.
 */
function historyLabel(fromStatus: string | null, toStatus: string): string {
  const toEstimate = parseEstimatedDeliveryEvent(toStatus)
  if (toEstimate !== null) {
    return toEstimate === ''
      ? 'Délai estimé retiré'
      : `Délai estimé : ${toEstimate}`
  }

  const to = HISTORY_LABELS[toStatus] ?? toStatus
  if (!fromStatus) return to
  return `${HISTORY_LABELS[fromStatus] ?? fromStatus} → ${to}`
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
      <Link href="/admin-r" className="back-link">
        <ArrowLeft size={16} /> Retour aux commandes
      </Link>

      <div className="admin-detail-heading">
        <h1>{order.reference}</h1>
        <div className="admin-detail-controls">
          <DeliveryStatusControl reference={order.reference} currentStatus={order.deliveryStatus} />
          <EstimatedDeliveryControl
            reference={order.reference}
            currentValue={order.estimatedDelivery}
          />
        </div>
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
                <dt>Mode de livraison</dt>
                <dd>
                  {order.deliveryMethod === 'boutique'
                    ? 'Récupération en boutique'
                    : 'Livraison à domicile'}
                </dd>
              </div>
              <div>
                <dt>{order.deliveryMethod === 'boutique' ? 'Adresse de retrait' : 'Adresse'}</dt>
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
              <div>
                <dt>Délai estimé</dt>
                <dd>{formatEstimatedDelivery(order.estimatedDelivery) ?? '—'}</dd>
              </div>
            </dl>
          </section>

          <section className="admin-card">
            <h2>Articles</h2>
            <div className="admin-table-scroll">
              <table className="admin-table">
              <thead>
                <tr>
                  <th>Produit</th>
                  <th>Réf.</th>
                  <th>Qté</th>
                  <th>Prix HT</th>
                  <th>Total</th>
                </tr>
              </thead>
              <tbody>
                {order.items.map((item) => (
                  <tr key={item.sku}>
                    <td>{item.name}</td>
                    <td>{item.sku}</td>
                    <td>{item.quantity}</td>
                    <td>{formatPriceHT(item.priceHT)}</td>
                    <td>{formatPriceHT(item.priceHT * item.quantity)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            </div>

            <div className="admin-totals">
              <div>
                <span>Sous-total HT</span>
                <strong>{formatPriceHT(order.subtotalHT)}</strong>
              </div>
              <div>
                <span>TVA</span>
                <strong>{formatPrice(order.totalTVA)}</strong>
              </div>
              <div>
                <span>Total TTC</span>
                <strong>{formatPrice(order.totalTTC)}</strong>
              </div>
              {order.timbreFiscal > 0 ? (
                <div>
                  <span>Timbre fiscal</span>
                  <strong>{formatPrice(order.timbreFiscal)}</strong>
                </div>
              ) : null}
              <div className="admin-totals-final">
                <span>Total à payer</span>
                <strong>{formatPrice(order.totalTTC + order.timbreFiscal)}</strong>
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
                      <strong>{historyLabel(entry.fromStatus, entry.toStatus)}</strong>
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
          <h2>Facture</h2>
          <InvoiceUploadControl
            reference={order.reference}
            hasInvoice={order.invoicePath !== null}
            isDelivered={order.deliveryStatus === 'livree'}
          />

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
