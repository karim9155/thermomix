import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import { requireAdvisorPage } from '@/lib/conseiller/guard'
import { getAdvisorDetail } from '@/lib/conseiller/network'
import { ApplicationForm } from '@/components/conseiller/forms'

export const metadata = { title: 'Proposer une recrue' }

export default async function CandidaturePage() {
  const session = await requireAdvisorPage()
  const advisor = await getAdvisorDetail(session.id)
  if (!advisor) notFound()

  return (
    <div className="admin-page advisor-narrow-page">
      <Link href="/conseiller/reseau" className="back-link">
        <ArrowLeft size={16} /> Retour à mon réseau
      </Link>
      <h1>Proposer une recrue</h1>
      <p className="admin-muted advisor-help">
        L&apos;administration valide chaque candidature. Une fois acceptée, la recrue reçoit son
        invitation et rejoint votre réseau.
      </p>
      <section className="admin-card">
        <ApplicationForm defaultRegion={advisor.region} />
      </section>
    </div>
  )
}
