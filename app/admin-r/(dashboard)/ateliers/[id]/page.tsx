import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import { z } from 'zod'
import { getWorkshop } from '@/lib/conseiller/workshops'
import { listSales } from '@/lib/conseiller/sales'
import {
  WorkshopFacts,
  WorkshopReportText,
  WorkshopStatusBadge,
} from '@/components/conseiller/workshop-display'
import { SalesTable } from '@/components/conseiller/sales-table'

export const metadata = { title: 'Atelier' }

export default async function AtelierAdminPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  if (!z.uuid().safeParse(id).success) notFound()

  const [workshop, sales] = await Promise.all([getWorkshop(id), listSales({ workshopId: id })])
  if (!workshop) notFound()

  return (
    <div className="admin-page">
      <Link href="/admin-r/ateliers" className="back-link">
        <ArrowLeft size={16} /> Retour aux ateliers
      </Link>

      <div className="admin-detail-heading">
        <div>
          <h1>Atelier{workshop.hostName ? ` chez ${workshop.hostName}` : ''}</h1>
          <div className="advisor-heading-meta">
            <WorkshopStatusBadge workshop={workshop} />
            <span className="admin-muted">
              Conseiller :{' '}
              <Link href={`/admin-r/conseillers/${workshop.advisorId}`} className="admin-table-link">
                {workshop.advisorName}
              </Link>
            </span>
          </div>
        </div>
      </div>

      <div className="admin-detail-grid">
        <div className="admin-detail-main">
          <section className="admin-card">
            <h2>Rapport</h2>
            {workshop.status === 'effectue' ? (
              <WorkshopReportText workshop={workshop} />
            ) : (
              <p className="admin-empty">
                {workshop.status === 'annule' ? 'Atelier annulé.' : 'Rapport pas encore saisi.'}
              </p>
            )}
          </section>

          <section className="admin-card">
            <h2>Ventes issues de l&apos;atelier</h2>
            {sales.length === 0 ? (
              <p className="admin-empty">Aucun bon de commande lié à cet atelier.</p>
            ) : (
              <SalesTable
                sales={sales}
                hrefBase="/admin-r/bons-de-commande"
                statuses={['a_facturer', 'facture', 'partiellement_paye', 'paye', 'annule']}
              />
            )}
          </section>
        </div>

        <aside className="admin-detail-side">
          <section className="admin-card">
            <h2>Détails</h2>
            <WorkshopFacts workshop={workshop} />
          </section>
        </aside>
      </div>
    </div>
  )
}
