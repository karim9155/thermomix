import Link from 'next/link'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { WORKSHOP_STATUS_CLASS, formatMonth, type Workshop } from '@/lib/conseiller/format'

const WEEKDAYS = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim']

const timeFormatter = new Intl.DateTimeFormat('fr-TN', {
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
  timeZone: 'Africa/Tunis',
})

const dayKeyFormatter = new Intl.DateTimeFormat('en-CA', { timeZone: 'Africa/Tunis' })

function shiftMonth(month: string, delta: number): string {
  const [year, mon] = month.split('-').map(Number)
  const date = new Date(Date.UTC(year, mon - 1 + delta, 1))
  return date.toISOString().slice(0, 7)
}

/**
 * A month grid of workshops (E7), Monday first. Server-rendered: moving
 * between months is a link (?mois=YYYY-MM), so it works without scripts
 * and every month has its own URL.
 */
export function WorkshopCalendar({
  month,
  today,
  workshops,
}: {
  /** 'YYYY-MM' */
  month: string
  today: string
  workshops: Workshop[]
}) {
  const [year, mon] = month.split('-').map(Number)
  const daysInMonth = new Date(Date.UTC(year, mon, 0)).getUTCDate()
  // getUTCDay: 0 = Sunday. Shift so Monday is column 0.
  const leading = (new Date(Date.UTC(year, mon - 1, 1)).getUTCDay() + 6) % 7

  const byDay = new Map<string, Workshop[]>()
  for (const workshop of workshops) {
    const key = dayKeyFormatter.format(new Date(workshop.scheduledAt))
    const list = byDay.get(key) ?? []
    list.push(workshop)
    byDay.set(key, list)
  }
  for (const list of byDay.values()) {
    list.sort((a, b) => a.scheduledAt.localeCompare(b.scheduledAt))
  }

  const cells: (number | null)[] = [
    ...Array.from({ length: leading }, () => null),
    ...Array.from({ length: daysInMonth }, (_, index) => index + 1),
  ]
  while (cells.length % 7 !== 0) cells.push(null)

  return (
    <div className="workshop-calendar">
      <div className="workshop-calendar-head">
        <Link href={`/admin-r/ateliers?mois=${shiftMonth(month, -1)}`} className="outline-button advisor-small-button" aria-label="Mois précédent">
          <ChevronLeft size={15} />
        </Link>
        <strong className="advisor-capitalize">{formatMonth(`${month}-01`)}</strong>
        <Link href={`/admin-r/ateliers?mois=${shiftMonth(month, 1)}`} className="outline-button advisor-small-button" aria-label="Mois suivant">
          <ChevronRight size={15} />
        </Link>
      </div>
      <div className="workshop-calendar-grid">
        {WEEKDAYS.map((day) => (
          <div key={day} className="workshop-calendar-weekday">
            {day}
          </div>
        ))}
        {cells.map((day, index) => {
          if (day === null) return <div key={`empty-${index}`} className="workshop-calendar-day is-empty" />
          const key = `${month}-${String(day).padStart(2, '0')}`
          const items = byDay.get(key) ?? []
          return (
            <div key={key} className={`workshop-calendar-day ${key === today ? 'is-today' : ''}`}>
              <span className="workshop-calendar-number">{day}</span>
              {items.map((workshop) => (
                <Link
                  key={workshop.id}
                  href={`/admin-r/ateliers/${workshop.id}`}
                  className={`workshop-calendar-event ${WORKSHOP_STATUS_CLASS[workshop.status]}`}
                  title={`${workshop.advisorName} — ${workshop.location}`}
                >
                  {timeFormatter.format(new Date(workshop.scheduledAt))} {workshop.advisorName}
                </Link>
              ))}
            </div>
          )
        })}
      </div>
    </div>
  )
}
