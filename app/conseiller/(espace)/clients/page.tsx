import Link from 'next/link'
import { UserPlus } from 'lucide-react'
import { requireAdvisorPage } from '@/lib/conseiller/guard'
import { listClients } from '@/lib/conseiller/clients'
import { ClientsTable } from '@/components/conseiller/clients-table'

export const metadata = { title: 'Mes clients' }

export default async function MesClientsPage() {
  const advisor = await requireAdvisorPage()
  const clients = await listClients({ advisorId: advisor.id })

  return (
    <div className="admin-page">
      <div className="admin-section-heading">
        <h1>Mes clients</h1>
        <Link href="/conseiller/clients/nouveau" className="primary-button">
          <UserPlus size={17} /> Nouveau client
        </Link>
      </div>
      <ClientsTable clients={clients} hrefBase="/conseiller/clients" />
    </div>
  )
}
