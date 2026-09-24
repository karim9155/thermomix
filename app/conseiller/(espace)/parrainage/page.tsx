import { notFound } from 'next/navigation'
import { MousePointerClick, ShoppingBag, UserCheck, Users } from 'lucide-react'
import { requireAdvisorPage } from '@/lib/conseiller/guard'
import { getAdvisorDetail } from '@/lib/conseiller/network'
import { affiliateUrl, getAffiliateStats } from '@/lib/conseiller/affiliation'
import { dateFormatter } from '@/lib/conseiller/format'
import { formatPrice } from '@/lib/product-format'
import type { DeliveryStatus } from '@/lib/admin/order-format'
import { DeliveryStatusBadge } from '@/components/admin/badges'
import { ShareLink } from '@/components/conseiller/share-link'

export const metadata = { title: 'Mon lien de parrainage' }

export default async function ParrainagePage() {
  const session = await requireAdvisorPage()

  // Always the signed-in advisor's own id, from the guard.
  const [advisor, stats] = await Promise.all([
    getAdvisorDetail(session.id),
    getAffiliateStats(session.id),
  ])
  if (!advisor) notFound()

  return (
    <div className="admin-page">
      <h1>Mon lien de parrainage</h1>

      <section className="admin-card advisor-card-gap">
        {advisor.affiliateCodeActive ? (
          <>
            <p className="admin-muted advisor-help">
              Partagez ce lien : toute commande passée en ligne par une personne qui l&apos;a ouvert
              vous est attribuée, même des mois plus tard. Si elle ouvre ensuite le lien d&apos;un
              autre conseiller, c&apos;est le dernier lien ouvert qui compte.
            </p>
            <ShareLink
              url={affiliateUrl(advisor.affiliateCode)}
              code={advisor.affiliateCode}
              name={`${advisor.prenom} ${advisor.nom}`}
            />
          </>
        ) : (
          <p className="field-error">
            Votre code est désactivé pour le moment. Contactez l&apos;administration.
          </p>
        )}
      </section>

      <div className="admin-stat-grid advisor-stat-grid-4">
        <div className="admin-stat-card">
          <MousePointerClick size={20} />
          <strong>{stats.clicks}</strong>
          <span>Clics ({stats.clicks30d} sur 30 jours)</span>
        </div>
        <div className="admin-stat-card">
          <Users size={20} />
          <strong>{stats.visitors}</strong>
          <span>Visiteurs uniques</span>
        </div>
        <div className="admin-stat-card">
          <UserCheck size={20} />
          <strong>{stats.customers}</strong>
          <span>Clients rattachés</span>
        </div>
        <div className="admin-stat-card">
          <ShoppingBag size={20} />
          <strong>
            {stats.orders.length} · {Math.round(stats.conversion * 100)} %
          </strong>
          <span>Commandes · conversion</span>
        </div>
      </div>

      <section className="admin-section">
        <h2>Commandes en ligne attribuées</h2>
        <p className="admin-muted advisor-help">
          Votre prime est acquise quand la commande est livrée et payée ; elle apparaît alors dans
          « Rémunération ».
        </p>
        {stats.orders.length === 0 ? (
          <p className="admin-empty">Aucune commande pour le moment.</p>
        ) : (
          <div className="admin-table-scroll">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Référence</th>
                  <th>Date</th>
                  <th>Client</th>
                  <th>Total TTC</th>
                  <th>Livraison</th>
                  <th>Paiement</th>
                </tr>
              </thead>
              <tbody>
                {stats.orders.map((order) => (
                  <tr key={order.reference}>
                    <td>
                      {order.reference}
                      {order.attributionSource === 'admin' ? (
                        <div className="admin-muted advisor-table-sub">
                          Attribuée par l&apos;administration
                        </div>
                      ) : null}
                    </td>
                    <td>{dateFormatter.format(new Date(order.createdAt))}</td>
                    <td>{order.customer}</td>
                    <td>{formatPrice(order.totalTTC)}</td>
                    <td>
                      <DeliveryStatusBadge status={order.deliveryStatus as DeliveryStatus} />
                    </td>
                    <td>
                      <span className={`admin-badge ${order.paid ? 'badge-green' : 'badge-gray'}`}>
                        {order.paid ? 'Payée' : 'En attente'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  )
}
