import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import { requireAdvisorPage } from '@/lib/conseiller/guard'
import { listClients } from '@/lib/conseiller/clients'
import { getAdvisorDetail } from '@/lib/conseiller/network'
import { WorkshopForm } from '@/components/conseiller/workshop-forms'

export const metadata = { title: 'Planifier un atelier' }

export default async function NouvelAtelierPage() {
  const session = await requireAdvisorPage()
  const [advisor, clients] = await Promise.all([
    getAdvisorDetail(session.id),
    listClients({ advisorId: session.id }),
  ])
  if (!advisor) notFound()

  return (
    <div className="admin-page advisor-narrow-page">
      <Link href="/conseiller/ateliers" className="back-link">
        <ArrowLeft size={16} /> Retour à mes ateliers
      </Link>
      <h1>Planifier un atelier</h1>
      <section className="admin-card">
        <WorkshopForm
          hosts={clients.map((client) => ({ id: client.id, name: `${client.prenom} ${client.nom}` }))}
          defaultRegion={advisor.region}
        />
      </section>
    </div>
  )
}
