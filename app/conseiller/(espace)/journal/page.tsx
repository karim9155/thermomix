import { requireAdvisorPage } from '@/lib/conseiller/guard'
import { getJournal, summarize, type JournalDay } from '@/lib/conseiller/journal'
import { parsePeriod } from '@/lib/conseiller/stats'
import { todayInTunis } from '@/lib/conseiller/sales'
import { PeriodPicker } from '@/components/conseiller/period-picker'
import { JournalDays, JournalSummary } from '@/components/conseiller/journal-view'
import { JournalComment } from '@/components/conseiller/journal-comment'

export const metadata = { title: 'Mon journal' }

export default async function JournalPage({
  searchParams,
}: {
  searchParams: Promise<{ du?: string; au?: string }>
}) {
  const advisor = await requireAdvisorPage()
  const today = todayInTunis()
  const period = parsePeriod(await searchParams, today)

  // Always the signed-in advisor's own journal.
  const days = await getJournal(advisor.id, period.from, period.to)

  // Today always has a card, so there's somewhere to write today's comment
  // even before anything was done.
  const withToday: JournalDay[] =
    period.to === today && !days.some((day) => day.day === today)
      ? [{ day: today, entries: [], counts: {}, comment: null }, ...days]
      : days

  return (
    <div className="admin-page">
      <h1>Mon journal d&apos;activité</h1>
      <p className="admin-muted advisor-help">
        Votre rapport se remplit tout seul à partir de ce que vous faites dans votre espace. Ajoutez
        un commentaire sur votre journée si vous le souhaitez.
      </p>

      <PeriodPicker period={period} today={today} basePath="/conseiller/journal" />

      <section className="admin-card advisor-section-gap">
        <h2>Sur la période</h2>
        <JournalSummary totals={summarize(days)} />
      </section>

      <section className="admin-section">
        <JournalDays
          days={withToday}
          renderComment={(day) => <JournalComment day={day.day} comment={day.comment} />}
        />
      </section>
    </div>
  )
}
