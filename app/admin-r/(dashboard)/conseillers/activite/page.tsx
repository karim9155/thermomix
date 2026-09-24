import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { z } from 'zod'
import { listActivity } from '@/lib/conseiller/activity'
import { listAdvisors } from '@/lib/conseiller/network'
import { parsePeriod } from '@/lib/conseiller/stats'
import { todayInTunis } from '@/lib/conseiller/sales'
import { ActivityFeed } from '@/components/conseiller/activity-feed'

export const metadata = { title: 'Activité des conseillers' }

const LIMIT = 300

function nextDay(isoDate: string): string {
  const date = new Date(`${isoDate}T12:00:00Z`)
  date.setUTCDate(date.getUTCDate() + 1)
  return date.toISOString().slice(0, 10)
}

/** Everything advisors did, and every admin action on them (J9), filterable. */
export default async function ActivitePage({
  searchParams,
}: {
  searchParams: Promise<{ conseiller?: string; du?: string; au?: string }>
}) {
  const params = await searchParams
  const today = todayInTunis()
  // Default: the last 7 days — the feed is for keeping an eye on things.
  const weekAgo = (() => {
    const date = new Date(`${today}T12:00:00Z`)
    date.setUTCDate(date.getUTCDate() - 6)
    return date.toISOString().slice(0, 10)
  })()
  const period = parsePeriod({ du: params.du ?? weekAgo, au: params.au }, today)
  const advisorId = params.conseiller && z.uuid().safeParse(params.conseiller).success ? params.conseiller : ''

  const [entries, advisors] = await Promise.all([
    listActivity({
      advisorId: advisorId || undefined,
      from: `${period.from}T00:00:00+01:00`,
      to: `${nextDay(period.to)}T00:00:00+01:00`,
      limit: LIMIT,
    }),
    listAdvisors(),
  ])

  return (
    <div className="admin-page">
      <Link href="/admin-r/conseillers" className="back-link">
        <ArrowLeft size={16} /> Retour aux conseillers
      </Link>
      <h1>Activité des conseillers</h1>

      <form method="get" className="period-picker-range activity-filters">
        <label>
          Conseiller
          <select name="conseiller" defaultValue={advisorId}>
            <option value="">Tous</option>
            {advisors.map((advisor) => (
              <option key={advisor.id} value={advisor.id}>
                {advisor.prenom} {advisor.nom}
              </option>
            ))}
          </select>
        </label>
        <label>
          Du
          <input type="date" name="du" defaultValue={period.from} max={today} />
        </label>
        <label>
          Au
          <input type="date" name="au" defaultValue={period.to} max={today} />
        </label>
        <button type="submit" className="outline-button advisor-small-button">
          Filtrer
        </button>
      </form>

      <section className="admin-card advisor-section-gap">
        {entries.length === LIMIT ? (
          <p className="admin-muted advisor-help">
            Les {LIMIT} actions les plus récentes sont affichées : réduisez la période pour voir le reste.
          </p>
        ) : null}
        <ActivityFeed entries={entries} showAdvisor={!advisorId} />
      </section>
    </div>
  )
}
