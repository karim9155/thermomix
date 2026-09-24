import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { listAdvisors, listGrades } from '@/lib/conseiller/network'
import { AdvisorCreateForm } from '@/components/admin/advisor-create-form'

export const metadata = { title: 'Nouveau conseiller' }

export default async function NouveauConseillerPage() {
  const [grades, advisors] = await Promise.all([listGrades(), listAdvisors()])

  // A suspended advisor can't be anyone's sponsor-to-be; everyone else can,
  // including advisors who haven't activated yet.
  const sponsors = advisors
    .filter((advisor) => advisor.status !== 'suspendu')
    .map((advisor) => ({ id: advisor.id, name: `${advisor.prenom} ${advisor.nom}` }))

  return (
    <div className="admin-page advisor-narrow-page">
      <Link href="/admin-r/conseillers" className="back-link">
        <ArrowLeft size={16} /> Retour aux conseillers
      </Link>
      <h1>Nouveau conseiller</h1>
      <AdvisorCreateForm grades={grades} sponsors={sponsors} />
    </div>
  )
}
