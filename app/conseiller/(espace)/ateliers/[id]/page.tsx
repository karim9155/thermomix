import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ArrowLeft, FileText } from 'lucide-react'
import { z } from 'zod'
import { requireAdvisorPage } from '@/lib/conseiller/guard'
import { getWorkshop } from '@/lib/conseiller/workshops'
import { listClients } from '@/lib/conseiller/clients'
import { listSales } from '@/lib/conseiller/sales'
import { SALE_STATUSES } from '@/lib/conseiller/format'
import {
  WorkshopFacts,
  WorkshopReportText,
  WorkshopStatusBadge,
} from '@/components/conseiller/workshop-display'
import {
  CancelWorkshopButton,
  WorkshopForm,
  WorkshopReportForm,
} from '@/components/conseiller/workshop-forms'
import { SalesTable } from '@/components/conseiller/sales-table'

export const metadata = { title: 'Atelier' }

export default async function AtelierPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  if (!z.uuid().safeParse(id).success) notFound()

  const advisor = await requireAdvisorPage()

  // Scoped to the signed-in advisor: another advisor's workshop is a 404.
  const workshop = await getWorkshop(id, { advisorId: advisor.id })
  if (!workshop) notFound()

  const started = new Date(workshop.scheduledAt) <= new Date()
  const [clients, sales] = await Promise.all([
    workshop.status === 'planifie' && !started ? listClients({ advisorId: advisor.id }) : Promise.resolve([]),
    listSales({ advisorId: advisor.id, workshopId: workshop.id }),
  ])

  return (
    <div className="admin-page">
      <Link href="/conseiller/ateliers" className="back-link">
        <ArrowLeft size={16} /> Retour à mes ateliers
      </Link>

      <div className="admin-detail-heading">
        <div>
          <h1>Atelier{workshop.hostName ? ` chez ${workshop.hostName}` : ''}</h1>
          <div className="advisor-heading-meta">
            <WorkshopStatusBadge workshop={workshop} />
          </div>
        </div>
        <div className="advisor-control-buttons">
          {workshop.status !== 'annule' ? (
            <Link href={`/conseiller/ventes/nouveau?atelier=${workshop.id}`} className="primary-button">
              <FileText size={15} /> Bon de commande issu de l&apos;atelier
            </Link>
          ) : null}
          {workshop.status === 'planifie' ? <CancelWorkshopButton workshopId={workshop.id} /> : null}
        </div>
      </div>

      <div className="admin-detail-grid">
        <div className="admin-detail-main">
          {workshop.status === 'planifie' && started ? (
            <section className="admin-card">
              <h2>Rapport de l&apos;atelier</h2>
              <p className="admin-muted advisor-help">
                L&apos;atelier a eu lieu : saisissez le rapport pour le marquer comme effectué.
              </p>
              <WorkshopReportForm workshop={workshop} />
            </section>
          ) : null}

          {workshop.status === 'planifie' && !started ? (
            <section className="admin-card">
              <h2>Modifier</h2>
              <WorkshopForm
                workshop={workshop}
                hosts={clients.map((client) => ({ id: client.id, name: `${client.prenom} ${client.nom}` }))}
                defaultRegion={workshop.gouvernorat}
              />
            </section>
          ) : null}

          {workshop.status === 'effectue' ? (
            <section className="admin-card">
              <h2>Rapport</h2>
              <WorkshopReportText workshop={workshop} />
              <details className="grade-edit advisor-section-gap">
                <summary>Modifier le rapport</summary>
                <WorkshopReportForm workshop={workshop} />
              </details>
            </section>
          ) : null}

          <section className="admin-card">
            <h2>Ventes issues de l&apos;atelier</h2>
            {sales.length === 0 ? (
              <p className="admin-empty">
                Aucune pour le moment. Liez un bon de commande à cet atelier au moment de le saisir.
              </p>
            ) : (
              <SalesTable sales={sales} hrefBase="/conseiller/ventes" statuses={[...SALE_STATUSES]} />
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
