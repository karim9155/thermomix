import 'server-only'
import { createAdminClient } from '@/lib/supabase/admin'
import { fetchAll } from '@/lib/supabase/fetch-all'
import type { ActivityEntry } from '@/lib/conseiller/format'

export type ActorRole = 'conseiller' | 'admin' | 'systeme'

/**
 * Appends one line to activity_log (use case J8).
 *
 * Call it AFTER the action it describes has succeeded, so the log only
 * ever records things that happened.
 *
 * A failed write is reported, not thrown: by the time we log, the action
 * itself is done, and telling the user it failed would make them retry
 * something that already went through. The log is still meant to be
 * complete — a failure here shows up in the server logs to be looked at.
 */
export async function logActivity(entry: {
  actorId: string | null
  actorRole: ActorRole
  advisorId: string | null
  action: string
  entityType?: string
  entityId?: string
  details?: Record<string, unknown>
}): Promise<void> {
  const supabase = createAdminClient()

  const { error } = await supabase.from('activity_log').insert({
    actor_id: entry.actorId,
    actor_role: entry.actorRole,
    advisor_id: entry.advisorId,
    action: entry.action,
    entity_type: entry.entityType ?? null,
    entity_id: entry.entityId ?? null,
    details: entry.details ?? {},
  })

  if (error) {
    console.error(`[activity] Échec de journalisation (${entry.action}):`, error)
  }
}

type ActivityRow = {
  id: number
  actor_role: ActorRole
  advisor_id: string | null
  action: string
  details: Record<string, unknown> | null
  created_at: string
}

/**
 * Newest first. With an advisorId, that advisor's feed (their own actions
 * and admin actions on them); without, the whole network's (J9). With an
 * entity, the history of one thing — an order form's timeline (D17).
 */
export async function listActivity(
  options: {
    advisorId?: string
    entity?: { type: string; id: string }
    /** ISO instants, `to` exclusive. */
    from?: string
    to?: string
    limit?: number
  } = {},
): Promise<ActivityEntry[]> {
  const supabase = createAdminClient()

  // Paged, so a limit above the API's 1000-row cap (the journal asks for
  // 2000) is actually honoured rather than silently cut at 1000.
  const data = await fetchAll(
    (from, to) => {
      let query = supabase
        .from('activity_log')
        .select('id, actor_role, advisor_id, action, details, created_at')
        .order('created_at', { ascending: false })
        .order('id', { ascending: false })

      if (options.advisorId) {
        query = query.eq('advisor_id', options.advisorId)
      }
      if (options.entity) {
        query = query.eq('entity_type', options.entity.type).eq('entity_id', options.entity.id)
      }
      if (options.from) query = query.gte('created_at', options.from)
      if (options.to) query = query.lt('created_at', options.to)
      return query.range(from, to)
    },
    { max: options.limit ?? 50 },
  )

  const rows = data as ActivityRow[]

  // Names come from a second query rather than a join: advisor_id is not
  // a foreign key (the log outlives what it describes), so PostgREST has
  // no relationship to embed.
  //
  // All advisors rather than `.in('user_id', ids)`: the network is small,
  // and a long id list in the URL can exceed the request length limit.
  const names = new Map<string, string>()

  if (rows.some((row) => row.advisor_id)) {
    const advisors = await fetchAll((from, to) =>
      supabase.from('advisors').select('user_id, prenom, nom').order('user_id').range(from, to),
    )
    for (const advisor of advisors) {
      names.set(advisor.user_id, `${advisor.prenom} ${advisor.nom}`)
    }
  }

  return rows.map((row) => ({
    id: row.id,
    actorRole: row.actor_role,
    action: row.action,
    details: row.details ?? {},
    createdAt: row.created_at,
    advisorName: row.advisor_id ? (names.get(row.advisor_id) ?? null) : null,
  }))
}
