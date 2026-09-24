import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { listActivity } from '@/lib/conseiller/activity'
import { ActivityFeed } from '@/components/conseiller/activity-feed'

export const metadata = { title: 'Activité des conseillers' }

export default async function ActivitePage() {
  const entries = await listActivity({ limit: 200 })

  return (
    <div className="admin-page">
      <Link href="/admin-r/conseillers" className="back-link">
        <ArrowLeft size={16} /> Retour aux conseillers
      </Link>
      <h1>Activité des conseillers</h1>
      <section className="admin-card">
        <ActivityFeed entries={entries} showAdvisor />
      </section>
    </div>
  )
}
