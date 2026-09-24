import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ArrowLeft, TriangleAlert } from 'lucide-react'
import { requireAdvisorPage } from '@/lib/conseiller/guard'
import { getSale } from '@/lib/conseiller/sales'
import { listClients } from '@/lib/conseiller/clients'
import { listActivity } from '@/lib/conseiller/activity'
import { getAllProducts } from '@/lib/products'
import { dateTimeFormatter, installmentCountLabel } from '@/lib/conseiller/format'
import { toEditorClients, toEditorProducts } from '@/lib/conseiller/editor-data'
import { SaleStatusBadge } from '@/components/conseiller/badges'
import { SaleLinesTable, ScheduleTable } from '@/components/conseiller/sale-summary'
import { ActivityFeed } from '@/components/conseiller/activity-feed'
import { OrderFormEditor } from '@/components/conseiller/order-form-editor'
import { CommissionLines } from '@/components/conseiller/commission-lines'
import { listEntries } from '@/lib/conseiller/remuneration'

export async function generateMetadata({ params }: { params: Promise<{ reference: string }> }) {
  const { reference } = await params
  return { title: reference }
}

export default async function VentePage({ params }: { params: Promise<{ reference: string }> }) {
  const { reference } = await params
  const advisor = await requireAdvisorPage()

  // Scoped to the signed-in advisor: another advisor's form is a 404.
  const sale = await getSale(reference, { advisorId: advisor.id })
  if (!sale) notFound()

  if (sale.saleStatus === 'brouillon') {
    const [clients, products] = await Promise.all([
      listClients({ advisorId: advisor.id }),
      getAllProducts(),
    ])

    return (
      <div className="admin-page">
        <Link href="/conseiller/ventes" className="back-link">
          <ArrowLeft size={16} /> Retour à mes ventes
        </Link>
        <div className="admin-detail-heading">
          <h1>{sale.reference}</h1>
          <SaleStatusBadge status={sale.saleStatus} />
        </div>

        {sale.refusalReason ? (
          <div className="advisor-alert">
            <TriangleAlert size={18} />
            <div>
              <strong>Bon renvoyé par l&apos;administration</strong>
              <p>{sale.refusalReason}</p>
            </div>
          </div>
        ) : null}

        <OrderFormEditor
          reference={sale.reference}
          products={toEditorProducts(products)}
          clients={toEditorClients(clients)}
          initial={{
            clientId: sale.clientId,
            items: sale.items.map((item) => ({ sku: item.sku, quantity: item.quantity })),
            deliveryMethod: sale.deliveryMethod,
            installmentCount: sale.installmentCount,
            notes: sale.notes ?? '',
          }}
        />
      </div>
    )
  }

  const [history, commissions] = await Promise.all([
    listActivity({ entity: { type: 'order', id: sale.reference } }),
    listEntries({ orderId: sale.id, advisorId: advisor.id }),
  ])

  return (
    <div className="admin-page">
      <Link href="/conseiller/ventes" className="back-link">
        <ArrowLeft size={16} /> Retour à mes ventes
      </Link>

      <div className="admin-detail-heading">
        <div>
          <h1>{sale.reference}</h1>
          <div className="advisor-heading-meta">
            <SaleStatusBadge status={sale.saleStatus} />
            <span className="admin-muted">{installmentCountLabel(sale.installmentCount)}</span>
          </div>
        </div>
      </div>

      {sale.saleStatus === 'annule' && sale.cancelReason ? (
        <div className="advisor-alert">
          <TriangleAlert size={18} />
          <div>
            <strong>Vente annulée</strong>
            <p>{sale.cancelReason}</p>
          </div>
        </div>
      ) : null}

      {sale.saleStatus === 'a_facturer' ? (
        <p className="admin-muted advisor-help">
          Soumis le {dateTimeFormatter.format(new Date(sale.submittedAt ?? sale.createdAt))} — en
          attente de validation par l&apos;administration.
        </p>
      ) : null}

      <div className="admin-detail-grid">
        <div className="admin-detail-main">
          <section className="admin-card">
            <h2>Produits</h2>
            <SaleLinesTable sale={sale} />
          </section>

          <section className="admin-card">
            <h2>Échéancier</h2>
            <ScheduleTable
              installments={sale.installments}
              totalDue={sale.totalDue}
              paidAmount={sale.paidAmount}
            />
          </section>

          <section className="admin-card">
            <h2>Ma prime</h2>
            <CommissionLines
              entries={commissions}
              empty="Votre prime sera calculée quand la vente sera entièrement payée."
            />
          </section>
        </div>

        <aside className="admin-detail-side">
          <section className="admin-card">
            <h2>Client</h2>
            <dl className="admin-def-list">
              <div>
                <dt>Nom</dt>
                <dd>
                  <Link href={`/conseiller/clients/${sale.client.id}`} className="admin-table-link">
                    {sale.client.prenom} {sale.client.nom}
                  </Link>
                </dd>
              </div>
              <div>
                <dt>Téléphone</dt>
                <dd>
                  <a href={`tel:${sale.client.telephone}`}>{sale.client.telephone}</a>
                </dd>
              </div>
              <div>
                <dt>Livraison</dt>
                <dd>{sale.deliveryMethod === 'boutique' ? 'Retrait en boutique' : 'À domicile'}</dd>
              </div>
            </dl>
          </section>

          <section className="admin-card">
            <h2>Historique</h2>
            <ActivityFeed entries={history} />
          </section>
        </aside>
      </div>
    </div>
  )
}
