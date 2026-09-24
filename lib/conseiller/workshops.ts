import 'server-only'
import { createAdminClient } from '@/lib/supabase/admin'
import { fetchAll } from '@/lib/supabase/fetch-all'
import { logActivity } from '@/lib/conseiller/activity'
import {
  tunisLocalToIso,
  type Workshop,
  type WorkshopFormValues,
  type WorkshopReportValues,
  type WorkshopStatus,
} from '@/lib/conseiller/format'

// Demonstration workshops (domain E). Service-role client: advisor-side
// callers pass their own id from the guard, and every read or write is
// scoped by it — an advisor never sees or touches another's workshops.

type WorkshopRow = {
  id: string
  advisor_id: string
  host_client_id: string | null
  scheduled_at: string
  location: string
  gouvernorat: string
  invited_count: number
  notes: string | null
  status: WorkshopStatus
  cancel_reason: string | null
  attendees_count: number | null
  contacts_count: number | null
  feedback: string | null
  observations: string | null
  reported_at: string | null
  advisor: { prenom: string; nom: string } | null
  host: { prenom: string; nom: string } | null
}

const WORKSHOP_SELECT = `
  id, advisor_id, host_client_id, scheduled_at, location, gouvernorat, invited_count, notes,
  status, cancel_reason, attendees_count, contacts_count, feedback, observations, reported_at,
  advisor:advisors!workshops_advisor_id_fkey ( prenom, nom ),
  host:clients!workshops_host_client_id_fkey ( prenom, nom )
`

/** Sales that count for a workshop: invoiced and not cancelled. */
const COUNTED = ['facture', 'partiellement_paye', 'paye']

/**
 * Counted sales per workshop. Scoped by advisor or workshop rather than an
 * `.in('workshop_id', [...])` list, which grows with history and would
 * eventually exceed the request URL limit.
 */
async function salesByWorkshop(scope: { advisorId?: string; workshopId?: string }) {
  const totals = new Map<string, { count: number; total: number }>()

  const supabase = createAdminClient()
  const data = await fetchAll((from, to) => {
    let query = supabase
      .from('orders')
      .select('id, workshop_id, total_ttc')
      .not('workshop_id', 'is', null)
      .in('sale_status', COUNTED)
    if (scope.advisorId) query = query.eq('advisor_id', scope.advisorId)
    if (scope.workshopId) query = query.eq('workshop_id', scope.workshopId)
    return query.order('id').range(from, to)
  })

  for (const row of data) {
    const current = totals.get(row.workshop_id) ?? { count: 0, total: 0 }
    current.count += 1
    current.total += Number(row.total_ttc)
    totals.set(row.workshop_id, current)
  }
  return totals
}

function mapRow(row: WorkshopRow, sales?: { count: number; total: number }): Workshop {
  return {
    id: row.id,
    advisorId: row.advisor_id,
    advisorName: row.advisor ? `${row.advisor.prenom} ${row.advisor.nom}` : '—',
    hostClientId: row.host_client_id,
    hostName: row.host ? `${row.host.prenom} ${row.host.nom}` : null,
    scheduledAt: row.scheduled_at,
    location: row.location,
    gouvernorat: row.gouvernorat,
    invitedCount: row.invited_count,
    notes: row.notes,
    status: row.status,
    cancelReason: row.cancel_reason,
    attendeesCount: row.attendees_count,
    contactsCount: row.contacts_count,
    feedback: row.feedback,
    observations: row.observations,
    reportedAt: row.reported_at,
    salesCount: sales?.count ?? 0,
    salesTotal: sales?.total ?? 0,
  }
}

/**
 * Workshops, soonest-last (newest date first). With advisorId, that
 * advisor's own (E6); without, everyone's (E7). `from`/`to` bound the
 * date (ISO instants), for the calendar.
 */
export async function listWorkshops(
  options: { advisorId?: string; from?: string; to?: string } = {},
): Promise<Workshop[]> {
  const supabase = createAdminClient()
  let query = supabase.from('workshops').select(WORKSHOP_SELECT).order('scheduled_at', { ascending: false })
  if (options.advisorId) query = query.eq('advisor_id', options.advisorId)
  if (options.from) query = query.gte('scheduled_at', options.from)
  if (options.to) query = query.lt('scheduled_at', options.to)

  const [{ data, error }, sales] = await Promise.all([
    query,
    salesByWorkshop({ advisorId: options.advisorId }),
  ])
  if (error) throw new Error(error.message)

  const rows = (data ?? []) as unknown as WorkshopRow[]
  return rows.map((row) => mapRow(row, sales.get(row.id)))
}

/** One workshop; with advisorId, undefined unless it's theirs. */
export async function getWorkshop(
  id: string,
  options: { advisorId?: string } = {},
): Promise<Workshop | undefined> {
  const supabase = createAdminClient()
  let query = supabase.from('workshops').select(WORKSHOP_SELECT).eq('id', id)
  if (options.advisorId) query = query.eq('advisor_id', options.advisorId)

  const { data, error } = await query.maybeSingle()
  if (error) throw new Error(error.message)
  if (!data) return undefined

  const sales = await salesByWorkshop({ workshopId: id })
  return mapRow(data as unknown as WorkshopRow, sales.get(id))
}

/** The host must be one of this advisor's own clients. */
async function checkHost(advisorId: string, hostClientId: string) {
  if (!hostClientId) return null
  const supabase = createAdminClient()
  const { data } = await supabase
    .from('clients')
    .select('id')
    .eq('id', hostClientId)
    .eq('advisor_id', advisorId)
    .maybeSingle()
  if (!data) throw new Error('Client hôte introuvable.')
  return hostClientId
}

function toColumns(values: WorkshopFormValues) {
  return {
    scheduled_at: tunisLocalToIso(values.scheduledAt),
    location: values.location,
    gouvernorat: values.gouvernorat,
    invited_count: values.invitedCount,
    notes: values.notes || null,
  }
}

export async function createWorkshop(advisorId: string, values: WorkshopFormValues): Promise<string> {
  const hostId = await checkHost(advisorId, values.hostClientId)
  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('workshops')
    .insert({ ...toColumns(values), advisor_id: advisorId, host_client_id: hostId })
    .select('id')
    .single()
  if (error) throw new Error(error.message)

  await logActivity({
    actorId: advisorId,
    actorRole: 'conseiller',
    advisorId,
    action: 'atelier.planifie',
    entityType: 'workshop',
    entityId: data.id,
    details: { le: values.scheduledAt, lieu: values.location },
  })
  return data.id
}

/** Only a planned workshop can be rescheduled or edited (E2). */
export async function updateWorkshop(
  advisorId: string,
  id: string,
  values: WorkshopFormValues,
): Promise<void> {
  const hostId = await checkHost(advisorId, values.hostClientId)
  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('workshops')
    .update({ ...toColumns(values), host_client_id: hostId })
    .eq('id', id)
    .eq('advisor_id', advisorId)
    .eq('status', 'planifie')
    .select('id')
  if (error) throw new Error(error.message)
  if (!data || data.length === 0) throw new Error("Seul un atelier planifié peut être modifié.")

  await logActivity({
    actorId: advisorId,
    actorRole: 'conseiller',
    advisorId,
    action: 'atelier.modifie',
    entityType: 'workshop',
    entityId: id,
    details: { le: values.scheduledAt, lieu: values.location },
  })
}

export async function cancelWorkshop(advisorId: string, id: string, reason: string): Promise<void> {
  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('workshops')
    .update({ status: 'annule', cancel_reason: reason })
    .eq('id', id)
    .eq('advisor_id', advisorId)
    .eq('status', 'planifie')
    .select('id')
  if (error) throw new Error(error.message)
  if (!data || data.length === 0) throw new Error("Seul un atelier planifié peut être annulé.")

  await logActivity({
    actorId: advisorId,
    actorRole: 'conseiller',
    advisorId,
    action: 'atelier.annule',
    entityType: 'workshop',
    entityId: id,
    details: { motif: reason },
  })
}

/**
 * Marks the workshop done with its report (E3, E4), or updates the report
 * of one already done. It can't be marked done before it has started.
 */
export async function saveWorkshopReport(
  advisorId: string,
  id: string,
  report: WorkshopReportValues,
): Promise<void> {
  const workshop = await getWorkshop(id, { advisorId })
  if (!workshop) throw new Error('Atelier introuvable.')
  if (workshop.status === 'annule') throw new Error('Cet atelier a été annulé.')
  if (workshop.status === 'planifie' && new Date(workshop.scheduledAt) > new Date()) {
    throw new Error("L'atelier n'a pas encore eu lieu.")
  }

  const supabase = createAdminClient()
  const { error } = await supabase
    .from('workshops')
    .update({
      status: 'effectue',
      attendees_count: report.attendeesCount,
      contacts_count: report.contactsCount,
      feedback: report.feedback || null,
      observations: report.observations || null,
      reported_at: new Date().toISOString(),
    })
    .eq('id', id)
    .eq('advisor_id', advisorId)
    .in('status', ['planifie', 'effectue'])
  if (error) throw new Error(error.message)

  await logActivity({
    actorId: advisorId,
    actorRole: 'conseiller',
    advisorId,
    action: workshop.status === 'planifie' ? 'atelier.effectue' : 'atelier.rapport_modifie',
    entityType: 'workshop',
    entityId: id,
    details: { presents: report.attendeesCount, contacts: report.contactsCount },
  })
}

/**
 * Workshops an order form can be linked to (E5): the advisor's own that
 * weren't cancelled, most recent first. A sale can follow a workshop by
 * weeks, so there's no date cut-off.
 */
export async function listLinkableWorkshops(advisorId: string) {
  const supabase = createAdminClient()
  const { data } = await supabase
    .from('workshops')
    .select('id, scheduled_at, location, host:clients!workshops_host_client_id_fkey ( prenom, nom )')
    .eq('advisor_id', advisorId)
    .neq('status', 'annule')
    .order('scheduled_at', { ascending: false })
    .limit(50)

  return (data ?? []).map((row) => {
    const host = row.host as unknown as { prenom: string; nom: string } | null
    return {
      id: row.id as string,
      scheduledAt: row.scheduled_at as string,
      label: host ? `chez ${host.prenom} ${host.nom}` : (row.location as string),
    }
  })
}

/** Checks a workshop id sent with an order form belongs to its advisor. */
export async function assertWorkshopOwner(advisorId: string, workshopId: string): Promise<void> {
  const supabase = createAdminClient()
  const { data } = await supabase
    .from('workshops')
    .select('id')
    .eq('id', workshopId)
    .eq('advisor_id', advisorId)
    .neq('status', 'annule')
    .maybeSingle()
  if (!data) throw new Error('Atelier introuvable.')
}
