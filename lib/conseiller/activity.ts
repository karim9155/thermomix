import 'server-only'
import { createAdminClient } from '@/lib/supabase/admin'
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
    limit?: number
  } = {},
): Promise<ActivityEntry[]> {
  const supabase = createAdminClient()

  let query = supabase
    .from('activity_log')
    .select('id, actor_role, advisor_id, action, details, created_at')
    .order('created_at', { ascending: false })
    .limit(options.limit ?? 50)

  if (options.advisorId) {
    query = query.eq('advisor_id', options.advisorId)
  }
  if (options.entity) {
    query = query.eq('entity_type', options.entity.type).eq('entity_id', options.entity.id)
  }

  const { data, error } = await query
  if (error) throw new Error(error.message)

  const rows = (data ?? []) as ActivityRow[]

  // Names come from a second query rather than a join: advisor_id is not
  // a foreign key (the log outlives what it describes), so PostgREST has
  // no relationship to embed.
  const ids = [...new Set(rows.map((row) => row.advisor_id).filter(Boolean))] as string[]
  const names = new Map<string, string>()

  if (ids.length > 0) {
    const { data: advisors } = await supabase
      .from('advisors')
      .select('user_id, prenom, nom')
      .in('user_id', ids)
    for (const advisor of advisors ?? []) {
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
