import { listClients } from '@/lib/conseiller/clients'
import { listAdvisors } from '@/lib/conseiller/network'
import { listAffiliatedCustomers } from '@/lib/conseiller/affiliation'
import { AdminClientsTable } from '@/components/admin/admin-clients-table'
import { AffiliatedCustomersTable } from '@/components/admin/affiliated-customers-table'

export const metadata = { title: 'Clients' }

export default async function ClientsPage() {
  const [clients, advisors, affiliated] = await Promise.all([
    listClients(),
    listAdvisors(),
    listAffiliatedCustomers(),
  ])

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

      <section className="admin-section">
        <h2>Clients affiliés (web)</h2>
        <p className="admin-muted advisor-help">
          Comptes clients arrivés par le lien de parrainage d&apos;un conseiller ou ayant saisi son
          code à la commande. Les réattribuer change leurs prochaines commandes ; celles déjà
          passées se réattribuent depuis la commande elle-même.
        </p>
        <AffiliatedCustomersTable customers={affiliated} advisors={choices} />
      </section>
    </div>
  )
}
