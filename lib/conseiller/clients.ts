import 'server-only'
import { createAdminClient } from '@/lib/supabase/admin'
import { fetchAll } from '@/lib/supabase/fetch-all'
import { logActivity, type ActorRole } from '@/lib/conseiller/activity'
import {
  telephoneKey,
  type ClientFormValues,
  type ClientListItem,
} from '@/lib/conseiller/format'

// Clients and prospects (domain C). Service-role client throughout, so
// every advisor-side function takes the advisor's id FROM THE GUARD and
// scopes by it — an advisor can only ever read or change their own
// clients. Admin callers pass no advisor id and see everyone.

type Actor = { id: string; role: ActorRole }

type ClientRow = {
  id: string
  advisor_id: string
  prenom: string
  nom: string
  telephone: string
  email: string | null
  adresse: string
  ville: string
  gouvernorat: string
  annee_naissance: number | null
  sexe: 'F' | 'H' | null
  notes: string | null
  user_id: string | null
  created_at: string
  advisor: { prenom: string; nom: string } | null
}

const CLIENT_SELECT = `
  id, advisor_id, prenom, nom, telephone, email, adresse, ville, gouvernorat,
  annee_naissance, sexe, notes, user_id, created_at,
  advisor:advisors!clients_advisor_id_fkey ( prenom, nom )
`

function ageFrom(birthYear: number | null): number | null {
  return birthYear ? new Date().getFullYear() - birthYear : null
}

function mapRow(row: ClientRow, invoicedClientIds: Set<string>): ClientListItem {
  return {
    id: row.id,
    prenom: row.prenom,
    nom: row.nom,
    telephone: row.telephone,
    email: row.email,
    gouvernorat: row.gouvernorat,
    ville: row.ville,
    age: ageFrom(row.annee_naissance),
    sexe: row.sexe,
    isClient: invoicedClientIds.has(row.id),
    hasAddress: Boolean(row.adresse && row.ville),
    advisorId: row.advisor_id,
    advisorName: row.advisor ? `${row.advisor.prenom} ${row.advisor.nom}` : '—',
    createdAt: row.created_at,
  }
}

/**
 * Ids of clients with at least one invoiced (not cancelled) sale — for one
 * advisor, or one client, or everyone.
 *
 * Not an `.in('client_id', [...all ids])`: every id goes into the request
 * URL, and a few hundred clients are enough to exceed the URL length limit
 * and fail the whole page.
 */
async function invoicedClientIds(scope: { advisorId?: string; clientId?: string }): Promise<Set<string>> {
  const supabase = createAdminClient()
  const rows = await fetchAll((from, to) => {
    // Scoped by the CLIENT's advisor (inner join), not the sale's: a
    // client reassigned to this advisor keeps sales made under the
    // previous one, and is still a client.
    let query = supabase
      .from('orders')
      .select(
        scope.advisorId
          ? 'id, client_id, client:clients!orders_client_id_fkey!inner ( advisor_id )'
          : 'id, client_id',
      )
      .not('client_id', 'is', null)
      .in('sale_status', ['facture', 'partiellement_paye', 'paye'])
    if (scope.advisorId) query = query.eq('client.advisor_id', scope.advisorId)
    if (scope.clientId) query = query.eq('client_id', scope.clientId)
    return query.order('id').range(from, to)
  })
  return new Set(rows.map((row) => (row as unknown as { client_id: string }).client_id))
}

export async function listClients(options: { advisorId?: string } = {}): Promise<ClientListItem[]> {
  const supabase = createAdminClient()

  const [data, invoiced] = await Promise.all([
    fetchAll((from, to) => {
      let query = supabase
        .from('clients')
        .select(CLIENT_SELECT)
        .order('created_at', { ascending: false })
        .order('id')
      if (options.advisorId) query = query.eq('advisor_id', options.advisorId)
      return query.range(from, to)
    }),
    invoicedClientIds({ advisorId: options.advisorId }),
  ])

  const rows = data as unknown as ClientRow[]
  return rows.map((row) => mapRow(row, invoiced))
}

export type ClientDetail = ClientListItem & {
  adresse: string
  notes: string | null
  hasAccount: boolean
  birthYear: number | null
}

/**
 * One client. With advisorId, returns undefined unless the client is that
 * advisor's — the caller renders a 404 either way, so a stranger's client
 * id reveals nothing.
 */
export async function getClient(
  clientId: string,
  options: { advisorId?: string } = {},
): Promise<ClientDetail | undefined> {
  const supabase = createAdminClient()

  let query = supabase.from('clients').select(CLIENT_SELECT).eq('id', clientId)
  if (options.advisorId) query = query.eq('advisor_id', options.advisorId)

  const { data, error } = await query.maybeSingle()
  if (error) throw new Error(error.message)
  if (!data) return undefined

  const row = data as unknown as ClientRow
  const invoiced = await invoicedClientIds({ clientId: row.id })

  return {
    ...mapRow(row, invoiced),
    adresse: row.adresse,
    notes: row.notes,
    hasAccount: row.user_id !== null,
    birthYear: row.annee_naissance,
  }
}

function toColumns(values: ClientFormValues) {
  return {
    prenom: values.prenom,
    nom: values.nom,
    telephone: values.telephone,
    telephone_key: telephoneKey(values.telephone),
    email: values.email ? values.email.toLowerCase() : null,
    adresse: values.adresse,
    ville: values.ville,
    gouvernorat: values.gouvernorat,
    annee_naissance: values.age ? new Date().getFullYear() - Number(values.age) : null,
    sexe: values.sexe || null,
    notes: values.notes || null,
  }
}

/**
 * Links a shop account with the same email (C4), so the client's sales
 * appear in their /compte once invoiced. Never unlinks: an email being
 * cleared later doesn't mean the account stopped being theirs.
 */
async function matchingAccountId(email: string | null): Promise<string | null> {
  if (!email) return null
  const supabase = createAdminClient()
  const { data } = await supabase.rpc('auth_user_id_by_email', { p_email: email })
  return (data as string | null) ?? null
}

/**
 * Explains a phone-number collision (C5). The number is unique across the
 * network, so the message says whose client it already is: the advisor
 * needs to know it's taken, and by whom, to sort it out with the admin.
 */
async function duplicatePhoneError(telephone: string, exceptId?: string): Promise<string | null> {
  const supabase = createAdminClient()
  let query = supabase
    .from('clients')
    .select('id, prenom, nom, advisor:advisors!clients_advisor_id_fkey ( prenom, nom )')
    .eq('telephone_key', telephoneKey(telephone))
  if (exceptId) query = query.neq('id', exceptId)

  const { data } = await query.maybeSingle()
  if (!data) return null

  const row = data as unknown as {
    prenom: string
    nom: string
    advisor: { prenom: string; nom: string } | null
  }
  const owner = row.advisor ? `${row.advisor.prenom} ${row.advisor.nom}` : 'un autre conseiller'
  return `Ce numéro appartient déjà au client ${row.prenom} ${row.nom}, suivi par ${owner}.`
}

export async function createClientRecord(
  advisorId: string,
  values: ClientFormValues,
  actor: Actor,
): Promise<string> {
  const duplicate = await duplicatePhoneError(values.telephone)
  if (duplicate) throw new Error(duplicate)

  const columns = toColumns(values)
  const supabase = createAdminClient()

  const { data, error } = await supabase
    .from('clients')
    .insert({
      ...columns,
      advisor_id: advisorId,
      user_id: await matchingAccountId(columns.email),
    })
    .select('id')
    .single()

  if (error) {
    // The unique index is the real guard; the check above only makes the
    // common case readable. Two simultaneous creations land here.
    if (error.code === '23505') {
      throw new Error((await duplicatePhoneError(values.telephone)) ?? 'Ce numéro existe déjà.')
    }
    throw new Error(error.message)
  }

  await logActivity({
    actorId: actor.id,
    actorRole: actor.role,
    advisorId,
    action: 'client.cree',
    entityType: 'client',
    entityId: data.id,
    details: { client: `${values.prenom} ${values.nom}` },
  })

  return data.id
}

export async function updateClientRecord(
  clientId: string,
  values: ClientFormValues,
  actor: Actor,
  options: { advisorId?: string } = {},
): Promise<void> {
  const existing = await getClient(clientId, options)
  if (!existing) throw new Error('Client introuvable.')

  const duplicate = await duplicatePhoneError(values.telephone, clientId)
  if (duplicate) throw new Error(duplicate)

  const columns = toColumns(values)
  const accountId = await matchingAccountId(columns.email)

  const supabase = createAdminClient()
  const { error } = await supabase
    .from('clients')
    .update(accountId ? { ...columns, user_id: accountId } : columns)
    .eq('id', clientId)

  if (error) {
    if (error.code === '23505') {
      throw new Error((await duplicatePhoneError(values.telephone, clientId)) ?? 'Ce numéro existe déjà.')
    }
    throw new Error(error.message)
  }

  await logActivity({
    actorId: actor.id,
    actorRole: actor.role,
    advisorId: existing.advisorId,
    action: 'client.modifie',
    entityType: 'client',
    entityId: clientId,
    details: { client: `${values.prenom} ${values.nom}` },
  })
}

/**
 * Moves a client to another advisor (C7). Past sales keep the advisor who
 * made them — only the follow-up moves.
 */
export async function reassignClient(clientId: string, advisorId: string, actor: Actor): Promise<void> {
  const existing = await getClient(clientId)
  if (!existing) throw new Error('Client introuvable.')
  if (existing.advisorId === advisorId) return

  const supabase = createAdminClient()

  const { data: target } = await supabase
    .from('advisors')
    .select('status')
    .eq('user_id', advisorId)
    .maybeSingle()
  if (!target) throw new Error('Conseiller introuvable.')
  if (target.status === 'suspendu') {
    throw new Error('Impossible de confier un client à un conseiller suspendu.')
  }
  const { error } = await supabase.from('clients').update({ advisor_id: advisorId }).eq('id', clientId)
  if (error) throw new Error(error.message)

  // Logged on both advisors' feeds: one lost a client, one gained it.
  for (const id of [existing.advisorId, advisorId]) {
    await logActivity({
      actorId: actor.id,
      actorRole: actor.role,
      advisorId: id,
      action: 'client.reattribue',
      entityType: 'client',
      entityId: clientId,
      details: {
        client: `${existing.prenom} ${existing.nom}`,
        de: existing.advisorId,
        vers: advisorId,
      },
    })
  }
}
