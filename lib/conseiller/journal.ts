import 'server-only'
import { createAdminClient } from '@/lib/supabase/admin'
import { listActivity } from '@/lib/conseiller/activity'
import type { ActivityEntry } from '@/lib/conseiller/format'

// The daily activity report (J2, J3): generated from the activity log —
// what the advisor did is already recorded there — plus an optional
// comment per day, the only thing the advisor writes.

export type JournalDay = {
  day: string
  entries: ActivityEntry[]
  /** Action key → how many times, for the day's summary line. */
  counts: Record<string, number>
  comment: string | null
}

const dayFormatter = new Intl.DateTimeFormat('en-CA', { timeZone: 'Africa/Tunis' })

/** Next calendar day, for an exclusive upper bound. */
function nextDay(isoDate: string): string {
  const date = new Date(`${isoDate}T12:00:00Z`)
  date.setUTCDate(date.getUTCDate() + 1)
  return date.toISOString().slice(0, 10)
}

// Signing in and out is logged for the admin, but is noise in a report of
// what the advisor did.
const NOT_WORK = new Set(['conseiller.connexion', 'conseiller.deconnexion'])

/**
 * One advisor's journal between two days (inclusive, Tunis time), newest
 * day first. Days with neither activity nor a comment are left out.
 */
export async function getJournal(advisorId: string, from: string, to: string): Promise<JournalDay[]> {
  const supabase = createAdminClient()
  const [entries, comments] = await Promise.all([
    listActivity({
      advisorId,
      from: `${from}T00:00:00+01:00`,
      to: `${nextDay(to)}T00:00:00+01:00`,
      limit: 2000,
    }),
    supabase
      .from('advisor_daily_reports')
      .select('day, comment')
      .eq('advisor_id', advisorId)
      .gte('day', from)
      .lte('day', to),
  ])

  const days = new Map<string, JournalDay>()
  const dayOf = (day: string) => {
    const existing = days.get(day)
    if (existing) return existing
    const created: JournalDay = { day, entries: [], counts: {}, comment: null }
    days.set(day, created)
    return created
  }

  for (const entry of entries) {
    if (NOT_WORK.has(entry.action)) continue
    const day = dayOf(dayFormatter.format(new Date(entry.createdAt)))
    day.entries.push(entry)
    day.counts[entry.action] = (day.counts[entry.action] ?? 0) + 1
  }
  for (const row of comments.data ?? []) {
    dayOf(row.day).comment = row.comment
  }

  return [...days.values()].sort((a, b) => b.day.localeCompare(a.day))
}

/** Totals over the whole period, per action (J3). */
export function summarize(days: JournalDay[]): Record<string, number> {
  const totals: Record<string, number> = {}
  for (const day of days) {
    for (const [action, count] of Object.entries(day.counts)) {
      totals[action] = (totals[action] ?? 0) + count
    }
  }
  return totals
}

/**
 * Saves (or clears, when empty) the advisor's comment on a day. Only for
 * today or the past: a report is about what happened.
 */
export async function saveDailyComment(
  advisorId: string,
  day: string,
  comment: string,
  today: string,
): Promise<void> {
  if (day > today) throw new Error('On ne commente pas une journée à venir.')

  const supabase = createAdminClient()
  const trimmed = comment.trim()

  const { error } = trimmed
    ? await supabase
        .from('advisor_daily_reports')
        .upsert({ advisor_id: advisorId, day, comment: trimmed }, { onConflict: 'advisor_id,day' })
    : await supabase.from('advisor_daily_reports').delete().eq('advisor_id', advisorId).eq('day', day)

  if (error) throw new Error(error.message)
}
