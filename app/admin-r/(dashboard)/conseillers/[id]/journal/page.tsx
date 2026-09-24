import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import { z } from 'zod'
import { getAdvisorDetail } from '@/lib/conseiller/network'
import { getJournal, summarize } from '@/lib/conseiller/journal'
import { parsePeriod } from '@/lib/conseiller/stats'
import { todayInTunis } from '@/lib/conseiller/sales'
import { PeriodPicker } from '@/components/conseiller/period-picker'
import { JournalDays, JournalSummary } from '@/components/conseiller/journal-view'

export const metadata = { title: "Journal d'activité" }

export default async function JournalAdminPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ du?: string; au?: string }>
}) {
  const { id } = await params
  if (!z.uuid().safeParse(id).success) notFound()

  const today = todayInTunis()
  const period = parsePeriod(await searchParams, today)
  const [advisor, days] = await Promise.all([
    getAdvisorDetail(id),
    getJournal(id, period.from, period.to),
  ])
  if (!advisor) notFound()

  return (
    <div className="admin-page">
      <Link href={`/admin-r/conseillers/${id}`} className="back-link">
        <ArrowLeft size={16} /> Retour à la fiche
      </Link>
      <h1>
        Journal — {advisor.prenom} {advisor.nom}
      </h1>

      <PeriodPicker period={period} today={today} basePath={`/admin-r/conseillers/${id}/journal`} />

      <section className="admin-card advisor-section-gap">
        <h2>Sur la période</h2>
        <JournalSummary totals={summarize(days)} />
      </section>

      <section className="admin-section">
        <JournalDays days={days} />
      </section>
    </div>
  )
}
