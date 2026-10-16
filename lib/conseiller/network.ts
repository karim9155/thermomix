import 'server-only'
import { cache } from 'react'
import { createAdminClient } from '@/lib/supabase/admin'
import type {
  AdvisorStatus,
  ApplicationStatus,
  Grade,
} from '@/lib/conseiller/format'

// Reads for the admin pages and the advisor area. Service-role client,
// so every caller has already run requireAdmin() or requireAdvisorPage()
// — and advisor-side callers pass THEIR OWN id, taken from the guard,
// never from the URL or a form.

export type AdvisorListItem = {
  id: string
  /** 8 digits, admin-chosen at creation and never changed (migration 0020). */
  matricule: string
  prenom: string
  nom: string
  email: string
  telephone: string
  region: string
  status: AdvisorStatus
  gradeId: string
  gradeName: string
  sponsorId: string | null
  sponsorName: string | null
  recruitCount: number
  affiliateCode: string
  createdAt: string
}

type AdvisorRow = {
  user_id: string
  matricule: string
  prenom: string
  nom: string
  email: string
  telephone: string
  region: string
  status: AdvisorStatus
  grade_id: string
  sponsor_id: string | null
  affiliate_code: string
  created_at: string
  grades: { name: string } | null
}

const ADVISOR_SELECT = `
  user_id, matricule, prenom, nom, email, telephone, region, status, grade_id, sponsor_id,
  affiliate_code, created_at,
  grades ( name )
`

export async function listGrades(): Promise<Grade[]> {
  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('grades')
    .select('id, name, rank')
    .eq('is_archived', false)
    .order('rank', { ascending: true })

  if (error) throw new Error(error.message)
  return data ?? []
}

/**
 * Every advisor, with sponsor names and direct-recruit counts resolved in
 * memory. One query for the whole network: it is a sales force, not a
 * user base, so it stays small enough that this beats N lookups.
 */
export const listAdvisors = cache(async (): Promise<AdvisorListItem[]> => {
  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('advisors')
    .select(ADVISOR_SELECT)
    .order('created_at', { ascending: true })

  if (error) throw new Error(error.message)

  const rows = (data ?? []) as unknown as AdvisorRow[]
  const byId = new Map(rows.map((row) => [row.user_id, row]))
  const recruitCounts = new Map<string, number>()
  for (const row of rows) {
    if (row.sponsor_id) {
      recruitCounts.set(row.sponsor_id, (recruitCounts.get(row.sponsor_id) ?? 0) + 1)
    }
  }

  return rows.map((row) => {
    const sponsor = row.sponsor_id ? byId.get(row.sponsor_id) : undefined
    return {
      id: row.user_id,
      matricule: row.matricule,
      prenom: row.prenom,
      nom: row.nom,
      email: row.email,
      telephone: row.telephone,
      region: row.region,
      status: row.status,
      gradeId: row.grade_id,
      gradeName: row.grades?.name ?? '—',
      sponsorId: row.sponsor_id,
      sponsorName: sponsor ? `${sponsor.prenom} ${sponsor.nom}` : null,
      recruitCount: recruitCounts.get(row.user_id) ?? 0,
      affiliateCode: row.affiliate_code,
      createdAt: row.created_at,
    }
  })
})

// ---------- TREE ----------

export type AdvisorTreeNode = AdvisorListItem & { children: AdvisorTreeNode[] }

/** The whole network as a forest: one root per founding advisor (B7). */
export function buildTree(advisors: AdvisorListItem[]): AdvisorTreeNode[] {
  const nodes = new Map<string, AdvisorTreeNode>(
    advisors.map((advisor) => [advisor.id, { ...advisor, children: [] }]),
  )
  const roots: AdvisorTreeNode[] = []

  for (const node of nodes.values()) {
    const parent = node.sponsorId ? nodes.get(node.sponsorId) : undefined
    if (parent) parent.children.push(node)
    else roots.push(node)
  }

  return roots
}

/** Ids of an advisor and everyone beneath them — never valid new sponsors. */
export function subtreeIds(advisors: AdvisorListItem[], rootId: string): Set<string> {
  const childrenOf = new Map<string, string[]>()
  for (const advisor of advisors) {
    if (!advisor.sponsorId) continue
    const list = childrenOf.get(advisor.sponsorId) ?? []
    list.push(advisor.id)
    childrenOf.set(advisor.sponsorId, list)
  }

  const ids = new Set<string>([rootId])
  const stack = [rootId]
  while (stack.length > 0) {
    const id = stack.pop()!
    for (const child of childrenOf.get(id) ?? []) {
      if (!ids.has(child)) {
        ids.add(child)
        stack.push(child)
      }
    }
  }
  return ids
}

// ---------- ONE ADVISOR ----------

export type AdvisorDetail = AdvisorListItem & {
  affiliateCodeActive: boolean
  invitedAt: string | null
  activatedAt: string | null
  suspendedAt: string | null
  sponsor: { id: string; prenom: string; nom: string; telephone: string; email: string; gradeName: string } | null
  recruits: AdvisorListItem[]
  gradeHistory: {
    id: string
    fromGrade: string | null
    toGrade: string
    reason: string | null
    effectiveAt: string
  }[]
}

export const getAdvisorDetail = cache(async (advisorId: string): Promise<AdvisorDetail | null> => {
  const supabase = createAdminClient()

  const [{ data: row, error }, { data: history }, advisors, grades] = await Promise.all([
    supabase
      .from('advisors')
      .select(`${ADVISOR_SELECT}, affiliate_code_active, invited_at, activated_at, suspended_at`)
      .eq('user_id', advisorId)
      .maybeSingle(),
    supabase
      .from('advisor_grade_history')
      .select('id, from_grade_id, to_grade_id, reason, effective_at')
      .eq('advisor_id', advisorId)
      .order('effective_at', { ascending: false }),
    listAdvisors(),
    supabase.from('grades').select('id, name'),
  ])

  if (error) throw new Error(error.message)
  if (!row) return null

  const item = advisors.find((advisor) => advisor.id === advisorId)
  if (!item) return null

  const gradeNames = new Map((grades.data ?? []).map((grade) => [grade.id, grade.name]))
  const sponsor = item.sponsorId ? advisors.find((advisor) => advisor.id === item.sponsorId) : null
  const extra = row as unknown as {
    affiliate_code_active: boolean
    invited_at: string | null
    activated_at: string | null
    suspended_at: string | null
  }

  return {
    ...item,
    affiliateCodeActive: extra.affiliate_code_active,
    invitedAt: extra.invited_at,
    activatedAt: extra.activated_at,
    suspendedAt: extra.suspended_at,
    sponsor: sponsor
      ? {
          id: sponsor.id,
          prenom: sponsor.prenom,
          nom: sponsor.nom,
          telephone: sponsor.telephone,
          email: sponsor.email,
          gradeName: sponsor.gradeName,
        }
      : null,
    recruits: advisors.filter((advisor) => advisor.sponsorId === advisorId),
    gradeHistory: (history ?? []).map((entry) => ({
      id: entry.id,
      fromGrade: entry.from_grade_id ? (gradeNames.get(entry.from_grade_id) ?? '—') : null,
      toGrade: gradeNames.get(entry.to_grade_id) ?? '—',
      reason: entry.reason,
      effectiveAt: entry.effective_at,
    })),
  }
})

// ---------- APPLICATIONS ----------

export type ApplicationItem = {
  id: string
  sponsorId: string
  sponsorName: string
  prenom: string
  nom: string
  email: string
  telephone: string
  region: string
  notes: string | null
  status: ApplicationStatus
  decisionReason: string | null
  decidedAt: string | null
  advisorId: string | null
  createdAt: string
}

type ApplicationRow = {
  id: string
  sponsor_id: string
  prenom: string
  nom: string
  email: string
  telephone: string
  region: string
  notes: string | null
  status: ApplicationStatus
  decision_reason: string | null
  decided_at: string | null
  advisor_id: string | null
  created_at: string
  sponsor: { prenom: string; nom: string } | null
}

/** All applications (admin), or those one advisor submitted. */
export async function listApplications(
  options: { sponsorId?: string } = {},
): Promise<ApplicationItem[]> {
  const supabase = createAdminClient()

  let query = supabase
    .from('advisor_applications')
    .select(
      `id, sponsor_id, prenom, nom, email, telephone, region, notes, status,
       decision_reason, decided_at, advisor_id, created_at,
       sponsor:advisors!advisor_applications_sponsor_id_fkey ( prenom, nom )`,
    )
    .order('created_at', { ascending: false })

  if (options.sponsorId) {
    query = query.eq('sponsor_id', options.sponsorId)
  }

  const { data, error } = await query
  if (error) throw new Error(error.message)

  return ((data ?? []) as unknown as ApplicationRow[]).map((row) => ({
    id: row.id,
    sponsorId: row.sponsor_id,
    sponsorName: row.sponsor ? `${row.sponsor.prenom} ${row.sponsor.nom}` : '—',
    prenom: row.prenom,
    nom: row.nom,
    email: row.email,
    telephone: row.telephone,
    region: row.region,
    notes: row.notes,
    status: row.status,
    decisionReason: row.decision_reason,
    decidedAt: row.decided_at,
    advisorId: row.advisor_id,
    createdAt: row.created_at,
  }))
}

export async function countPendingApplications(): Promise<number> {
  const supabase = createAdminClient()
  const { count, error } = await supabase
    .from('advisor_applications')
    .select('id', { count: 'exact', head: true })
    .eq('status', 'en_attente')

  if (error) throw new Error(error.message)
  return count ?? 0
}
