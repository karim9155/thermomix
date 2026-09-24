import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ArrowLeft, FileText } from 'lucide-react'
import { z } from 'zod'
import { requireAdvisorPage } from '@/lib/conseiller/guard'
import { getClient } from '@/lib/conseiller/clients'
import { listSales } from '@/lib/conseiller/sales'
import { ClientForm } from '@/components/conseiller/client-form'
import { SalesTable } from '@/components/conseiller/sales-table'
import { SALE_STATUSES } from '@/lib/conseiller/format'

export const metadata = { title: 'Client' }

export default async function ClientPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  if (!z.uuid().safeParse(id).success) notFound()

  const advisor = await requireAdvisorPage()

  // Scoped to the signed-in advisor: another advisor's client is a 404.
  const [client, sales] = await Promise.all([
    getClient(id, { advisorId: advisor.id }),
    listSales({ advisorId: advisor.id, clientId: id }),
  ])
  if (!client) notFound()

  return (
    <div className="admin-page">
      <Link href="/conseiller/clients" className="back-link">
        <ArrowLeft size={16} /> Retour à mes clients
      </Link>

      <div className="admin-section-heading">
        <div>
          <h1>
            {client.prenom} {client.nom}
          </h1>
          <div className="advisor-heading-meta">
            <span className={`admin-badge ${client.isClient ? 'badge-green' : 'badge-gray'}`}>
              {client.isClient ? 'Client' : 'Prospect'}
            </span>
            {client.hasAccount ? (
              <span className="admin-muted">Compte boutique rattaché</span>
            ) : null}
          </div>
        </div>
        <Link href={`/conseiller/ventes/nouveau?client=${client.id}`} className="primary-button">
          <FileText size={17} /> Nouveau bon de commande
        </Link>
      </div>

      <section className="admin-card advisor-card-gap">
        <h2>Fiche client</h2>
        <ClientForm
          clientId={client.id}
          defaults={{
            prenom: client.prenom,
            nom: client.nom,
            telephone: client.telephone,
            email: client.email ?? '',
            adresse: client.adresse,
            ville: client.ville,
            gouvernorat: client.gouvernorat,
            age: client.age ? String(client.age) : '',
            sexe: client.sexe ?? '',
            notes: client.notes ?? '',
          }}
        />
      </section>

      <section className="admin-section">
        <h2>Bons de commande</h2>
        <SalesTable
          sales={sales}
          hrefBase="/conseiller/ventes"
          statuses={SALE_STATUSES.filter((status) => sales.some((sale) => sale.saleStatus === status))}
        />
      </section>
    </div>
  )
}
