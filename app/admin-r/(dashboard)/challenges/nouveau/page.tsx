import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { todayInTunis } from '@/lib/conseiller/sales'
import { ChallengeForm } from '@/components/admin/challenge-form'

export const metadata = { title: 'Nouveau challenge' }

export default function NouveauChallengePage() {
  return (
    <div className="admin-page advisor-narrow-page">
      <Link href="/admin-r/challenges" className="back-link">
        <ArrowLeft size={16} /> Retour aux challenges
      </Link>
      <h1>Nouveau challenge</h1>
      <p className="admin-muted advisor-help">
        Le challenge est créé en brouillon : les conseillers ne le voient qu&apos;une fois publié.
      </p>
      <section className="admin-card">
        <ChallengeForm today={todayInTunis()} />
      </section>
    </div>
  )
}
