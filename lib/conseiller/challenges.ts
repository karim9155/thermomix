import 'server-only'
import { createAdminClient } from '@/lib/supabase/admin'
import { logActivity, type ActorRole } from '@/lib/conseiller/activity'
import { EMPTY_METRICS, metricsBetween, type Metrics } from '@/lib/conseiller/performance'
import type {
  Challenge,
  ChallengeFormValues,
  ChallengeMetric,
  ChallengeStatus,
  RankingRow,
} from '@/lib/conseiller/format'

// Challenges (domain H). Rankings are computed live from the same
// metrics as grades (lib/conseiller/performance.ts), so a challenge
// always reflects the latest paid sales (H5). Closing — winners and
// prizes — happens in one database transaction (close_challenge,
// migration 0017).

type Actor = { id: string; role: ActorRole }

const BUCKET = 'challenge-images'

type ChallengeRow = {
  id: string
  title: string
  description: string | null
  image_url: string | null
  metric: ChallengeMetric
  target: number | null
  winners_count: number | null
  reward_label: string | null
  prize_amount: number
  starts_on: string
  ends_on: string
  status: ChallengeStatus
  closed_at: string | null
}

const CHALLENGE_SELECT =
  'id, title, description, image_url, metric, target, winners_count, reward_label, prize_amount, starts_on, ends_on, status, closed_at'

function mapChallenge(row: ChallengeRow): Challenge {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    imageUrl: row.image_url,
    metric: row.metric,
    target: row.target === null ? null : Number(row.target),
    winnersCount: row.winners_count,
    rewardLabel: row.reward_label,
    prizeAmount: Number(row.prize_amount),
    startsOn: row.starts_on,
    endsOn: row.ends_on,
    status: row.status,
    closedAt: row.closed_at,
  }
}

/** Newest first. Advisors pass `visibleOnly`: drafts are the admin's. */
export async function listChallenges(options: { visibleOnly?: boolean } = {}): Promise<Challenge[]> {
  const supabase = createAdminClient()
  let query = supabase.from('challenges').select(CHALLENGE_SELECT).order('starts_on', { ascending: false })
  if (options.visibleOnly) query = query.in('status', ['publie', 'cloture'])

  const { data, error } = await query
  if (error) throw new Error(error.message)
  return ((data ?? []) as ChallengeRow[]).map(mapChallenge)
}

export async function getChallenge(
  id: string,
  options: { visibleOnly?: boolean } = {},
): Promise<Challenge | undefined> {
  const supabase = createAdminClient()
  let query = supabase.from('challenges').select(CHALLENGE_SELECT).eq('id', id)
  if (options.visibleOnly) query = query.in('status', ['publie', 'cloture'])

  const { data, error } = await query.maybeSingle()
  if (error) throw new Error(error.message)
  return data ? mapChallenge(data as ChallengeRow) : undefined
}

function toColumns(values: ChallengeFormValues) {
  return {
    title: values.title,
    description: values.description || null,
    metric: values.metric,
    target: values.target,
    winners_count: values.winnersCount,
    reward_label: values.rewardLabel || null,
    prize_amount: values.prizeAmount,
    starts_on: values.startsOn,
    ends_on: values.endsOn,
  }
}

export async function createChallenge(values: ChallengeFormValues, actor: Actor): Promise<string> {
  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('challenges')
    .insert({ ...toColumns(values), created_by: actor.id })
    .select('id')
    .single()
  if (error) throw new Error(error.message)

  await logActivity({
    actorId: actor.id,
    actorRole: actor.role,
    advisorId: null,
    action: 'challenge.cree',
    entityType: 'challenge',
    entityId: data.id,
    details: { titre: values.title },
  })
  return data.id
}

/** Any field, until the challenge is closed — its results are then final. */
export async function updateChallenge(id: string, values: ChallengeFormValues, actor: Actor): Promise<void> {
  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('challenges')
    .update(toColumns(values))
    .eq('id', id)
    .neq('status', 'cloture')
    .select('id')
  if (error) throw new Error(error.message)
  if (!data || data.length === 0) throw new Error('Un challenge clôturé ne peut plus être modifié.')

  await logActivity({
    actorId: actor.id,
    actorRole: actor.role,
    advisorId: null,
    action: 'challenge.modifie',
    entityType: 'challenge',
    entityId: id,
    details: { titre: values.title },
  })
}

/** Publish on the advisors' wall, or take back to draft (H2). */
export async function setChallengePublished(id: string, published: boolean, actor: Actor): Promise<void> {
  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('challenges')
    .update({ status: published ? 'publie' : 'brouillon' })
    .eq('id', id)
    .eq('status', published ? 'brouillon' : 'publie')
    .select('id')
  if (error) throw new Error(error.message)
  if (!data || data.length === 0) throw new Error('Ce challenge a changé entre-temps. Rechargez la page.')

  await logActivity({
    actorId: actor.id,
    actorRole: actor.role,
    advisorId: null,
    action: published ? 'challenge.publie' : 'challenge.depublie',
    entityType: 'challenge',
    entityId: id,
  })
}

/** Only a draft can be deleted: once published, advisors have seen it. */
export async function deleteChallenge(id: string, actor: Actor): Promise<void> {
  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('challenges')
    .delete()
    .eq('id', id)
    .eq('status', 'brouillon')
    .select('title, image_url')
  if (error) throw new Error(error.message)
  if (!data || data.length === 0) throw new Error('Seul un brouillon peut être supprimé.')

  const path = storagePath(data[0].image_url)
  if (path) await supabase.storage.from(BUCKET).remove([path])

  await logActivity({
    actorId: actor.id,
    actorRole: actor.role,
    advisorId: null,
    action: 'challenge.supprime',
    entityType: 'challenge',
    entityId: id,
    details: { titre: data[0].title },
  })
}

function storagePath(url: string | null): string | null {
  if (!url) return null
  const marker = `/storage/v1/object/public/${BUCKET}/`
  const index = url.indexOf(marker)
  return index >= 0 ? url.slice(index + marker.length) : null
}

/** Sets (or replaces) the challenge's picture. */
export async function setChallengeImage(id: string, file: File): Promise<void> {
  const supabase = createAdminClient()
  const { data: current } = await supabase.from('challenges').select('image_url').eq('id', id).maybeSingle()

  const extension = file.type === 'image/png' ? 'png' : file.type === 'image/webp' ? 'webp' : 'jpg'
  const path = `${id}/${Date.now()}.${extension}`
  const { error: uploadError } = await supabase.storage
    .from(BUCKET)
    .upload(path, file, { contentType: file.type || 'image/jpeg', upsert: false })
  if (uploadError) throw new Error(`Échec de l'envoi de l'image : ${uploadError.message}`)

  const { data: publicUrl } = supabase.storage.from(BUCKET).getPublicUrl(path)
  const { error } = await supabase.from('challenges').update({ image_url: publicUrl.publicUrl }).eq('id', id)
  if (error) throw new Error(error.message)

  const previous = storagePath(current?.image_url ?? null)
  if (previous) await supabase.storage.from(BUCKET).remove([previous])
}

// ---------- RANKING (H4, H5) ----------

function scoreOf(metric: ChallengeMetric, metrics: Metrics): number {
  switch (metric) {
    case 'ventes':
      return metrics.sales
    case 'robots':
      return metrics.robots
    case 'ca':
      return metrics.revenue
    case 'recrues':
      return metrics.recruits
  }
}

/**
 * Every active advisor's score over the challenge's dates, best first.
 * A running challenge is measured up to today; a future one ranks
 * nobody yet.
 */
export async function rankChallenge(challenge: Challenge, today: string): Promise<RankingRow[]> {
  if (challenge.startsOn > today) return []

  const until = challenge.endsOn < today ? challenge.endsOn : today
  const supabase = createAdminClient()
  const [metrics, advisors] = await Promise.all([
    metricsBetween(challenge.startsOn, until),
    supabase.from('advisors').select('user_id, prenom, nom').eq('status', 'actif'),
  ])

  const rows = (advisors.data ?? [])
    .map((advisor) => {
      const score = scoreOf(challenge.metric, metrics.get(advisor.user_id) ?? EMPTY_METRICS)
      return {
        advisorId: advisor.user_id,
        // First name and initial: this list is shown to every advisor.
        name: `${advisor.prenom} ${String(advisor.nom).slice(0, 1)}.`,
        score,
        rank: 0,
        reachedTarget: challenge.target === null ? score > 0 : score >= challenge.target,
      }
    })
    .sort((a, b) => b.score - a.score || a.name.localeCompare(b.name, 'fr'))

  rows.forEach((row, index) => {
    row.rank = index > 0 && rows[index - 1].score === row.score ? rows[index - 1].rank : index + 1
  })
  return rows
}

/**
 * The winners the rules point to (H6): those who scored and reached the
 * target, capped at winners_count. Ties at the cut-off are all included —
 * the admin can untick before confirming.
 */
export function proposedWinners(challenge: Challenge, ranking: RankingRow[]): RankingRow[] {
  const eligible = ranking.filter((row) => row.score > 0 && row.reachedTarget)
  if (challenge.winnersCount === null) return eligible

  const cutoff = eligible[challenge.winnersCount - 1]
  return cutoff ? eligible.filter((row) => row.rank <= cutoff.rank) : eligible
}

// ---------- CLOSING (H6, H7) ----------

/**
 * Closes the challenge with the winners the admin confirmed; prizes go
 * into the commission ledger in the same transaction (close_challenge).
 * Scores are recomputed here, never taken from the browser.
 */
export async function closeChallenge(
  id: string,
  winnerIds: string[],
  actor: Actor,
  today: string,
): Promise<void> {
  const challenge = await getChallenge(id)
  if (!challenge) throw new Error('Challenge introuvable.')

  const ranking = await rankChallenge(challenge, today)
  const byId = new Map(ranking.map((row) => [row.advisorId, row]))
  const winners = [...new Set(winnerIds)].map((advisorId) => {
    const row = byId.get(advisorId)
    if (!row) throw new Error('Un des gagnants choisis ne fait pas partie du classement.')
    return { advisor_id: row.advisorId, rank: row.rank, score: row.score }
  })

  const supabase = createAdminClient()
  const { error } = await supabase.rpc('close_challenge', {
    p_challenge: id,
    p_winners: winners,
    p_actor: actor.id,
  })
  if (error) {
    if (error.message.includes('challenge_en_cours')) {
      throw new Error("Le challenge n'est pas encore terminé : il pourra être clôturé le lendemain de sa date de fin.")
    }
    if (error.message.includes('challenge_non_publie')) {
      throw new Error('Seul un challenge publié peut être clôturé.')
    }
    throw new Error(error.message)
  }

  await logActivity({
    actorId: actor.id,
    actorRole: actor.role,
    advisorId: null,
    action: 'challenge.cloture',
    entityType: 'challenge',
    entityId: id,
    details: { titre: challenge.title, gagnants: winners.length },
  })
  for (const winner of winners) {
    await logActivity({
      actorId: actor.id,
      actorRole: actor.role,
      advisorId: winner.advisor_id,
      action: 'challenge.gagne',
      entityType: 'challenge',
      entityId: id,
      details: { titre: challenge.title, rang: winner.rank, prime: challenge.prizeAmount },
    })
  }
}

export type ChallengeWinner = { advisorId: string; name: string; rank: number; score: number; prize: number }

export async function listWinners(challengeId: string): Promise<ChallengeWinner[]> {
  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('challenge_winners')
    .select('advisor_id, rank, score, prize_amount, advisors ( prenom, nom )')
    .eq('challenge_id', challengeId)
    .order('rank', { ascending: true })
  if (error) throw new Error(error.message)

  return (data ?? []).map((row) => {
    const advisor = row.advisors as unknown as { prenom: string; nom: string } | null
    return {
      advisorId: row.advisor_id,
      name: advisor ? `${advisor.prenom} ${String(advisor.nom).slice(0, 1)}.` : '—',
      rank: row.rank,
      score: Number(row.score),
      prize: Number(row.prize_amount),
    }
  })
}

/** Challenges an advisor won (H8). */
export async function listWonChallengeIds(advisorId: string): Promise<Map<string, number>> {
  const supabase = createAdminClient()
  const { data } = await supabase
    .from('challenge_winners')
    .select('challenge_id, rank')
    .eq('advisor_id', advisorId)
  return new Map((data ?? []).map((row) => [row.challenge_id, row.rank]))
}
