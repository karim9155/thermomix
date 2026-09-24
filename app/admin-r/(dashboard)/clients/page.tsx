import { listClients } from '@/lib/conseiller/clients'
import { listAdvisors } from '@/lib/conseiller/network'
import { AdminClientsTable } from '@/components/admin/admin-clients-table'

export const metadata = { title: 'Clients' }

export default async function ClientsPage() {
  const [clients, advisors] = await Promise.all([listClients(), listAdvisors()])

  // Every advisor is listed so each row can show its current one, but a
  // suspended advisor can't be chosen as the new owner.
  const choices = advisors.map((advisor) => ({
    id: advisor.id,
    name: `${advisor.prenom} ${advisor.nom}`,
    suspended: advisor.status === 'suspendu',
  }))

  return (
    <div className="admin-page">
      <h1>Clients des conseillers</h1>
      <AdminClientsTable clients={clients} advisors={choices} />
    </div>
  )
}
