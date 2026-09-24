import { activityLabel, dateTimeFormatter, type ActivityEntry } from '@/lib/conseiller/format'
import type { JournalDay } from '@/lib/conseiller/journal'
import { formatDay } from '@/components/conseiller/sale-summary'

const longDay = new Intl.DateTimeFormat('fr-FR', {
  weekday: 'long',
  day: 'numeric',
  month: 'long',
  timeZone: 'UTC',
})

const timeOnly = new Intl.DateTimeFormat('fr-TN', {
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
  timeZone: 'Africa/Tunis',
})

/** "3 bons de commande soumis · 1 client créé" — the day in one line. */
function summaryLine(counts: Record<string, number>): string {
  return Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .map(([action, count]) => `${count} × ${activityLabel(action).toLowerCase()}`)
    .join(' · ')
}

/** Totals over the period (J3), most frequent first. */
export function JournalSummary({ totals }: { totals: Record<string, number> }) {
  const entries = Object.entries(totals).sort((a, b) => b[1] - a[1])
  if (entries.length === 0) return <p className="admin-empty">Aucune activité sur cette période.</p>

  return (
    <ul className="advisor-simple-list journal-summary">
      {entries.map(([action, count]) => (
        <li key={action}>
          <strong>{count}</strong>
          <span>{activityLabel(action)}</span>
        </li>
      ))}
    </ul>
  )
}

/**
 * The generated daily report (J2): one card per day with what was done
 * and the advisor's comment. `renderComment` lets the advisor's page put
 * an editable field there; the admin's page shows the text only.
 */
export function JournalDays({
  days,
  renderComment,
}: {
  days: JournalDay[]
  renderComment?: (day: JournalDay) => React.ReactNode
}) {
  if (days.length === 0) return <p className="admin-empty">Rien sur cette période.</p>

  return (
    <div className="journal-days">
      {days.map((day) => (
        <section key={day.day} className="admin-card journal-day">
          <h3 className="advisor-subheading advisor-subheading-flush journal-day-title">
            {longDay.format(new Date(`${day.day}T12:00:00Z`))}
            <span className="admin-muted"> · {formatDay(day.day)}</span>
          </h3>
          {day.entries.length > 0 ? (
            <>
              <p className="journal-day-summary">{summaryLine(day.counts)}</p>
              <details>
                <summary>Détail ({day.entries.length})</summary>
                <ul className="journal-entries">
                  {day.entries.map((entry: ActivityEntry) => (
                    <li key={entry.id} title={dateTimeFormatter.format(new Date(entry.createdAt))}>
                      <span className="admin-muted">{timeOnly.format(new Date(entry.createdAt))}</span>{' '}
                      {activityLabel(entry.action)}
                      {entry.actorRole === 'admin' ? <span className="admin-muted"> (administration)</span> : null}
                    </li>
                  ))}
                </ul>
              </details>
            </>
          ) : (
            <p className="admin-muted advisor-help">Aucune action enregistrée ce jour-là.</p>
          )}
          {renderComment ? (
            renderComment(day)
          ) : day.comment ? (
            <blockquote className="journal-comment">{day.comment}</blockquote>
          ) : null}
        </section>
      ))}
    </div>
  )
}
