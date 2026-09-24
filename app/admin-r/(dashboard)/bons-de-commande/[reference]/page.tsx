import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ArrowLeft, Truck, TriangleAlert } from 'lucide-react'
import { getSale, todayInTunis } from '@/lib/conseiller/sales'
import { listActivity } from '@/lib/conseiller/activity'
import { getProductsBySkus } from '@/lib/products'
import { TIMBRE_FISCAL, calculateDeliveryFee } from '@/lib/product-format'
import { dateTimeFormatter, installmentCountLabel } from '@/lib/conseiller/format'
import { SaleStatusBadge } from '@/components/conseiller/badges'
import { RemainingSummary, SaleLinesTable } from '@/components/conseiller/sale-summary'
import { ActivityFeed } from '@/components/conseiller/activity-feed'
import { CancelSale, InvoiceDecision } from '@/components/admin/sale-admin-actions'
import { InstallmentsAdmin } from '@/components/admin/installments-admin'

export async function generateMetadata({ params }: { params: Promise<{ reference: string }> }) {
  const { reference } = await params
  return { title: reference }
}

export default async function BonDeCommandePage({
  params,
}: {
  params: Promise<{ reference: string }>
}) {
  const { reference } = await params
  const sale = await getSale(reference)
  if (!sale) notFound()

  const history = await listActivity({ entity: { type: 'order', id: sale.reference } })

  // What the delivery fee WOULD be, shown next to its checkbox at
  // invoicing. The server recomputes it itself when the box is ticked.
  let deliveryFeePreview = 0
  if (sale.saleStatus === 'a_facturer') {
    const products = await getProductsBySkus(sale.items.map((item) => item.sku))
    deliveryFeePreview = calculateDeliveryFee(
      sale.items.flatMap((item) => {
        const product = products.get(item.sku)
        return product ? [{ category: product.category }] : []
      }),
      sale.deliveryMethod,
    )
  }

  const invoiced = sale.invoicedAt !== null
  const cancelled = sale.saleStatus === 'annule'

  return (
    <div className="admin-page">
      <Link href="/admin-r/bons-de-commande" className="back-link">
        <ArrowLeft size={16} /> Retour aux bons de commande
      </Link>

      <div className="admin-detail-heading">
        <div>
          <h1>{sale.reference}</h1>
          <div className="advisor-heading-meta">
            <SaleStatusBadge status={sale.saleStatus} />
            <span className="admin-muted">
              {installmentCountLabel(sale.installmentCount)} · Conseiller :{' '}
              <Link href={`/admin-r/conseillers/${sale.advisorId}`} className="admin-table-link">
                {sale.advisorName}
              </Link>
            </span>
          </div>
        </div>
        <div className="advisor-control-buttons">
          {invoiced ? (
            <Link href={`/admin-r/livraisons/${sale.reference}`} className="outline-button">
              <Truck size={15} /> Livraison et facture PDF
            </Link>
          ) : null}
          {!cancelled ? <CancelSale reference={sale.reference} status={sale.saleStatus} /> : null}
        </div>
      </div>

      {cancelled && sale.cancelReason ? (
        <div className="advisor-alert">
          <TriangleAlert size={18} />
          <div>
            <strong>
              Vente annulée
              {sale.cancelledAt ? ` le ${dateTimeFormatter.format(new Date(sale.cancelledAt))}` : ''}
            </strong>
            <p>{sale.cancelReason}</p>
          </div>
        </div>
      ) : null}

      <div className="admin-detail-grid">
        <div className="admin-detail-main">
          <section className="admin-card">
            <h2>Produits</h2>
            <SaleLinesTable sale={sale} />
          </section>

          {invoiced ? (
            <section className="admin-card">
              <h2>Échéancier et encaissements</h2>
              <InstallmentsAdmin
                reference={sale.reference}
                installments={sale.installments}
                canCollect={!cancelled}
                canRevise={sale.saleStatus === 'facture' || sale.saleStatus === 'partiellement_paye'}
                today={todayInTunis()}
              />
              <RemainingSummary totalDue={sale.totalDue} paidAmount={sale.paidAmount} />
            </section>
          ) : null}

          <section className="admin-card">
            <h2>Historique</h2>
            <ActivityFeed entries={history} />
          </section>
        </div>

        <aside className="admin-detail-side">
          {sale.saleStatus === 'a_facturer' ? (
            <section className="admin-card">
              <h2>Validation</h2>
              <InvoiceDecision
                reference={sale.reference}
                totalTTC={sale.totalTTC}
                deliveryFeePreview={deliveryFeePreview}
                timbrePreview={TIMBRE_FISCAL}
                installmentLabel={installmentCountLabel(sale.installmentCount)}
              />
            </section>
          ) : null}

          <section className="admin-card">
            <h2>Client</h2>
            <dl className="admin-def-list">
              <div>
                <dt>Nom</dt>
                <dd>
                  {sale.client.prenom} {sale.client.nom}
                </dd>
              </div>
              <div>
                <dt>Téléphone</dt>
                <dd>
                  <a href={`tel:${sale.client.telephone}`}>{sale.client.telephone}</a>
                </dd>
              </div>
              {sale.client.email ? (
                <div>
                  <dt>Email</dt>
                  <dd>{sale.client.email}</dd>
                </div>
              ) : null}
              <div>
                <dt>Livraison</dt>
                <dd>
                  {sale.deliveryMethod === 'boutique'
                    ? 'Retrait en boutique'
                    : `${sale.client.adresse}, ${sale.client.ville}, ${sale.client.gouvernorat}`}
                </dd>
              </div>
              <div>
                <dt>Compte boutique</dt>
                <dd>
                  {sale.client.hasAccount
                    ? 'Oui — la vente apparaît dans son espace client'
                    : 'Non'}
                </dd>
              </div>
              {sale.notes ? (
                <div>
                  <dt>Notes du conseiller</dt>
                  <dd>{sale.notes}</dd>
                </div>
              ) : null}
            </dl>
          </section>
        </aside>
      </div>
    </div>
  )
}
