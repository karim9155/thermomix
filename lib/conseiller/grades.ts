import 'server-only'
import { createAdminClient } from '@/lib/supabase/admin'
import { logActivity, type ActorRole } from '@/lib/conseiller/activity'
import { EMPTY_METRICS, metricsBetween, windowStart, type Metrics } from '@/lib/conseiller/performance'
import type { GradeCriteria, GradeDetail, GradeFormValues } from '@/lib/conseiller/format'

// Grades (domain F): the grades themselves (F1–F2), who meets which
// grade's criteria (F4–F5), and an advisor's progress (F7). Promotions
// themselves go through changeAdvisorGrade() in accounts.ts, which keeps
// the history (F6, F8).

type Actor = { id: string; role: ActorRole }

type GradeRow = {
  id: string
  name: string
  rank: number
  description: string | null
  is_archived: boolean
  min_revenue: number
  min_sales: number
  min_recruits: number
  period_months: number
}

const GRADE_SELECT =
  'id, name, rank, description, is_archived, min_revenue, min_sales, min_recruits, period_months'

function mapCriteria(row: GradeRow): GradeCriteria {
  return {
    minRevenue: Number(row.min_revenue),
    minSales: row.min_sales,
    minRecruits: row.min_recruits,
    periodMonths: row.period_months,
  }
}

/** Every grade, archived included, with how many advisors hold it (admin). */
export async function listGradesDetailed(): Promise<GradeDetail[]> {
  const supabase = createAdminClient()
  const [grades, advisors] = await Promise.all([
    supabase.from('grades').select(GRADE_SELECT).order('rank', { ascending: true }),
    supabase.from('advisors').select('grade_id').neq('status', 'suspendu'),
  ])
  if (grades.error) throw new Error(grades.error.message)

  const counts = new Map<string, number>()
  for (const row of advisors.data ?? []) {
    counts.set(row.grade_id, (counts.get(row.grade_id) ?? 0) + 1)
  }

  return ((grades.data ?? []) as GradeRow[]).map((row) => ({
    id: row.id,
    name: row.name,
    rank: row.rank,
    description: row.description,
    isArchived: row.is_archived,
    criteria: mapCriteria(row),
    advisorCount: counts.get(row.id) ?? 0,
  }))
}

function toColumns(values: GradeFormValues) {
  return {
    name: values.name,
    rank: values.rank,
    description: values.description || null,
    min_revenue: values.minRevenue,
    min_sales: values.minSales,
    min_recruits: values.minRecruits,
    period_months: values.periodMonths,
  }
}

function friendlyUniqueError(message: string): string {
  if (message.includes('grades_name_key')) return 'Un grade porte déjà ce nom.'
  if (message.includes('grades_rank_key')) return 'Un grade occupe déjà ce rang.'
  return message
}

/**
 * Creates a grade (F1) with its remuneration (F3) starting today. A grade
 * without a commission rule would silently earn 0, so the two are made
 * together.
 */
export async function createGrade(
  values: GradeFormValues & { robotSaleBonus: number; recruitmentBonus: number },
  actor: Actor,
  today: string,
): Promise<void> {
  const supabase = createAdminClient()
  const { data, error } = await supabase.from('grades').insert(toColumns(values)).select('id').single()
  if (error) throw new Error(friendlyUniqueError(error.message))

  const { error: ruleError } = await supabase.from('commission_rules').insert({
    grade_id: data.id,
    robot_sale_bonus: values.robotSaleBonus,
    recruitment_bonus: values.recruitmentBonus,
    effective_from: today,
    created_by: actor.id,
  })
  if (ruleError) {
    await supabase.from('grades').delete().eq('id', data.id)
    throw new Error(ruleError.message)
  }

  await logActivity({
    actorId: actor.id,
    actorRole: actor.role,
    advisorId: null,
    action: 'grade.cree',
    entityType: 'grade',
    entityId: data.id,
    details: { nom: values.name, rang: values.rank },
  })
}

/** Name, rank, description and criteria (F1, F2). Amounts are edited in Rémunération. */
export async function updateGrade(id: string, values: GradeFormValues, actor: Actor): Promise<void> {
  const supabase = createAdminClient()
  const { error } = await supabase.from('grades').update(toColumns(values)).eq('id', id)
  if (error) throw new Error(friendlyUniqueError(error.message))

  await logActivity({
    actorId: actor.id,
    actorRole: actor.role,
    advisorId: null,
    action: 'grade.modifie',
    entityType: 'grade',
    entityId: id,
    details: { nom: values.name, rang: values.rank },
  })
}

/**
 * Archives or restores a grade (F1). An archived grade can no longer be
 * given to anyone; advisors who hold it keep it until moved. The last
 * active grade can't be archived — new advisors need one to start on.
 */
export async function setGradeArchived(id: string, archived: boolean, actor: Actor): Promise<void> {
  const supabase = createAdminClient()

  if (archived) {
    const { count } = await supabase
      .from('grades')
      .select('id', { count: 'exact', head: true })
      .eq('is_archived', false)
      .neq('id', id)
    if (!count) throw new Error('Impossible d’archiver le dernier grade actif.')
  }

  const { error } = await supabase.from('grades').update({ is_archived: archived }).eq('id', id)
  if (error) throw new Error(error.message)

  await logActivity({
    actorId: actor.id,
    actorRole: actor.role,
    advisorId: null,
    action: archived ? 'grade.archive' : 'grade.restaure',
    entityType: 'grade',
    entityId: id,
  })
}

// ---------- EVALUATION (F4, F5) ----------

export function hasCriteria(criteria: GradeCriteria): boolean {
  return criteria.minRevenue > 0 || criteria.minSales > 0 || criteria.minRecruits > 0
}

export function meetsCriteria(criteria: GradeCriteria, metrics: Metrics): boolean {
  return (
    metrics.revenue >= criteria.minRevenue &&
    metrics.sales >= criteria.minSales &&
    metrics.recruits >= criteria.minRecruits
  )
}

/**
 * Metrics per advisor for each window length the active grades use —
 * one query set per distinct period, not per grade.
 */
async function metricsByPeriod(grades: GradeDetail[], today: string) {
  const periods = [...new Set(grades.map((grade) => grade.criteria.periodMonths))]
  const entries = await Promise.all(
    periods.map(async (months) => [months, await metricsBetween(windowStart(today, months), today)] as const),
  )
  return new Map(entries)
}

export type GradeEvaluation = {
  advisorId: string
  advisorName: string
  currentGrade: GradeDetail
  /** Highest active grade whose criteria are met, if above the current one. */
  proposed: GradeDetail | null
  /** Whether the advisor still meets their own grade's criteria. */
  meetsCurrent: boolean
  metrics: Metrics
}

/**
 * Every active advisor against every active grade (F4). The result's
 * `proposed` entries are the promotion proposals the admin validates
 * (F5). Computed live rather than stored: it is always current, and
 * nothing is promoted until the admin says so.
 */
export async function evaluateAdvisors(today: string): Promise<GradeEvaluation[]> {
  const supabase = createAdminClient()
  const [grades, advisors] = await Promise.all([
    listGradesDetailed(),
    supabase.from('advisors').select('user_id, prenom, nom, grade_id').eq('status', 'actif'),
  ])
  const active = grades.filter((grade) => !grade.isArchived)
  const byPeriod = await metricsByPeriod(active, today)
  const gradeById = new Map(grades.map((grade) => [grade.id, grade]))

  return (advisors.data ?? []).flatMap((advisor) => {
    const current = gradeById.get(advisor.grade_id)
    if (!current) return []

    const metricsFor = (grade: GradeDetail) =>
      byPeriod.get(grade.criteria.periodMonths)?.get(advisor.user_id) ?? EMPTY_METRICS

    // A higher grade with no criteria at all hasn't been configured yet:
    // "no requirement" there would propose everyone. Only the starting
    // grade is meant to be criteria-free.
    const qualifying = active.filter(
      (grade) =>
        (grade.rank === active[0]?.rank || hasCriteria(grade.criteria)) &&
        meetsCriteria(grade.criteria, metricsFor(grade)),
    )
    const best = qualifying.at(-1) ?? null

    return [
      {
        advisorId: advisor.user_id,
        advisorName: `${advisor.prenom} ${advisor.nom}`,
        currentGrade: current,
        proposed: best && best.rank > current.rank ? best : null,
        meetsCurrent: meetsCriteria(current.criteria, metricsFor(current)),
        metrics: metricsFor(best && best.rank > current.rank ? best : current),
      },
    ]
  })
}

// ---------- ADVISOR PROGRESS (F7) ----------

export type GradeProgress = {
  current: GradeDetail | null
  next: GradeDetail | null
  /** Measured over the NEXT grade's window, since that's what counts. */
  metrics: Metrics
  windowFrom: string
}

export async function getGradeProgress(advisorId: string, today: string): Promise<GradeProgress> {
  const supabase = createAdminClient()
  const [grades, advisor] = await Promise.all([
    listGradesDetailed(),
    supabase.from('advisors').select('grade_id').eq('user_id', advisorId).maybeSingle(),
  ])

  const current = grades.find((grade) => grade.id === advisor.data?.grade_id) ?? null
  const next =
    grades.find((grade) => !grade.isArchived && current !== null && grade.rank > current.rank) ?? null

  const months = (next ?? current)?.criteria.periodMonths ?? 3
  const from = windowStart(today, months)
  const metrics = (await metricsBetween(from, today)).get(advisorId) ?? EMPTY_METRICS

  return { current, next, metrics, windowFrom: from }
}
