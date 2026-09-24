import Link from 'next/link'
import type { Period } from '@/lib/conseiller/stats'

function shift(isoDate: string, days: number): string {
  const date = new Date(`${isoDate}T12:00:00Z`)
  date.setUTCDate(date.getUTCDate() + days)
  return date.toISOString().slice(0, 10)
}

function presets(today: string): { label: string; from: string; to: string }[] {
  const monthStart = `${today.slice(0, 7)}-01`
  const lastMonthEnd = shift(monthStart, -1)
  return [
    { label: 'Ce mois', from: monthStart, to: today },
    { label: 'Mois dernier', from: `${lastMonthEnd.slice(0, 7)}-01`, to: lastMonthEnd },
    { label: '90 jours', from: shift(today, -89), to: today },
    { label: 'Cette année', from: `${today.slice(0, 4)}-01-01`, to: today },
  ]
}

/**
 * Date range for a statistics page: presets plus a free range. A plain
 * GET form — no script needed, and every period has its own URL that can
 * be bookmarked or shared.
 */
export function PeriodPicker({
  period,
  today,
  basePath,
}: {
  period: Period
  today: string
  basePath: string
}) {
  return (
    <div className="period-picker">
      <div className="admin-tabs">
        {presets(today).map((preset) => {
          const active = preset.from === period.from && preset.to === period.to
          return (
            <Link
              key={preset.label}
              href={`${basePath}?du=${preset.from}&au=${preset.to}`}
              className={active ? 'admin-tab active' : 'admin-tab'}
            >
              {preset.label}
            </Link>
          )
        })}
      </div>
      <form method="get" action={basePath} className="period-picker-range">
        <label>
          Du
          <input type="date" name="du" defaultValue={period.from} max={today} />
        </label>
        <label>
          Au
          <input type="date" name="au" defaultValue={period.to} max={today} />
        </label>
        <button type="submit" className="outline-button advisor-small-button">
          Afficher
        </button>
      </form>
    </div>
  )
}
