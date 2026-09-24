import 'server-only'
import { createAdminClient } from '@/lib/supabase/admin'
import { logActivity, type ActorRole } from '@/lib/conseiller/activity'
import { sendAdvisorAccessEmail, type AccessEmailKind } from '@/lib/conseiller/email'
import type { AdvisorStatus } from '@/lib/conseiller/format'

// Every function here writes through the service-role client and trusts
// its caller to have run requireAdmin() or requireAdvisor() first. None of
// them is exported to the browser: they are called from Server Actions.

type Actor = { id: string; role: ActorRole }

export type AccessLinkResult = {
  /** One-time link to /conseiller/activation. Shown to the admin so it can
      be passed on by hand (WhatsApp, SMS) when email is not configured. */
  link: string
  emailSent: boolean
}

function siteUrl(): string {
  return process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'
}

function activationUrl(tokenHash: string, type: 'invite' | 'recovery'): string {
  const url = new URL('/conseiller/activation', siteUrl())
  url.searchParams.set('token_hash', tokenHash)
  url.searchParams.set('type', type)
  return url.toString()
}

// ---------- AFFILIATE CODE ----------
// First name in capitals plus four random characters, e.g. KARIM-7Q4X:
// readable when dictated over the phone, and the alphabet leaves out 0/O
// and 1/I, which people confuse. Uniqueness is the database's job — the
// caller retries on a collision.

const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'

function generateAffiliateCode(prenom: string): string {
  const base =
    prenom
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .toUpperCase()
      .replace(/[^A-Z]/g, '')
      .slice(0, 8) || 'INO'

  let suffix = ''
  for (let i = 0; i < 4; i++) {
    suffix += CODE_ALPHABET[Math.floor(Math.random() * CODE_ALPHABET.length)]
  }
  return `${base}-${suffix}`
}

// ---------- ACCESS LINKS ----------

/**
 * Generates a one-time link for this account and emails it.
 *
 * `invite` works for an account that has never been confirmed; for one
 * that has (a customer who became an advisor, or an advisor who needs a
 * new password) Supabase refuses it, and a `recovery` link does the same
 * job: prove control of the mailbox, then choose a password.
 *
 * The link points at our own /conseiller/activation page rather than at
 * Supabase's verify endpoint, and that page only verifies when the
 * advisor presses its button. Mail scanners that pre-open every link
 * would otherwise burn the one-time token before the advisor ever saw it.
 */
async function issueAccessLink(input: {
  email: string
  prenom: string
  preferInvite: boolean
  kind: AccessEmailKind
}): Promise<AccessLinkResult> {
  const supabase = createAdminClient()

  let tokenHash: string | undefined
  let type: 'invite' | 'recovery' = 'recovery'

  if (input.preferInvite) {
    const { data, error } = await supabase.auth.admin.generateLink({
      type: 'invite',
      email: input.email,
    })
    if (!error && data.properties?.hashed_token) {
      tokenHash = data.properties.hashed_token
      type = 'invite'
    }
  }

  if (!tokenHash) {
    const { data, error } = await supabase.auth.admin.generateLink({
      type: 'recovery',
      email: input.email,
    })
    if (error || !data.properties?.hashed_token) {
      throw new Error("Impossible de générer le lien d'accès. Merci de réessayer.")
    }
    tokenHash = data.properties.hashed_token
  }

  const link = activationUrl(tokenHash, type)
  const emailSent = await sendAdvisorAccessEmail({
    kind: input.kind,
    to: input.email,
    prenom: input.prenom,
    link,
  })

  return { link, emailSent }
}

// ---------- CREATE ----------

export type CreateAdvisorInput = {
  prenom: string
  nom: string
  email: string
  telephone: string
  region: string
  gradeId: string
  sponsorId: string | null
}

/**
 * Creates an advisor account and sends the invitation (A1, A2, B5).
 *
 * If the email already has an auth account — typically a customer who is
 * becoming an advisor — that account is linked instead of failing, and
 * the advisor sets a password through the same kind of one-time link.
 * Either way the new advisor starts in status `invite`.
 */
export async function createAdvisorAccount(
  input: CreateAdvisorInput,
  actor: Actor,
): Promise<{ advisorId: string } & AccessLinkResult> {
  const supabase = createAdminClient()
  const email = input.email.trim().toLowerCase()

  const { data: existingAdvisor } = await supabase
    .from('advisors')
    .select('user_id')
    .eq('email', email)
    .maybeSingle()

  if (existingAdvisor) {
    throw new Error('Un conseiller existe déjà avec cet email.')
  }

  const { data: existingUserId, error: lookupError } = await supabase.rpc(
    'auth_user_id_by_email',
    { p_email: email },
  )
  if (lookupError) throw new Error(lookupError.message)

  let userId = existingUserId as string | null
  let createdAuthUser = false

  if (!userId) {
    const { data, error } = await supabase.auth.admin.createUser({
      email,
      email_confirm: false,
      user_metadata: { prenom: input.prenom, nom: input.nom },
    })
    if (error || !data.user) {
      throw new Error('Impossible de créer le compte. Merci de réessayer.')
    }
    userId = data.user.id
    createdAuthUser = true
  }

  // A collision on the affiliate code is the only unique violation worth
  // retrying; anything else is a real error.
  let lastError: string | undefined
  let inserted = false

  for (let attempt = 0; attempt < 5 && !inserted; attempt++) {
    const { error } = await supabase.from('advisors').insert({
      user_id: userId,
      email,
      prenom: input.prenom,
      nom: input.nom,
      telephone: input.telephone,
      region: input.region,
      grade_id: input.gradeId,
      sponsor_id: input.sponsorId,
      status: 'invite',
      affiliate_code: generateAffiliateCode(input.prenom),
    })

    if (!error) {
      inserted = true
    } else if (error.code === '23505' && error.message.includes('affiliate_code')) {
      lastError = error.message
    } else {
      lastError = error.message
      break
    }
  }

  if (!inserted) {
    // Don't leave an orphan login behind: an auth user with no advisor
    // row would block the next attempt with the same email.
    if (createdAuthUser) {
      await supabase.auth.admin.deleteUser(userId)
    }
    throw new Error(lastError ?? 'Impossible de créer le conseiller.')
  }

  await supabase.from('advisor_grade_history').insert({
    advisor_id: userId,
    from_grade_id: null,
    to_grade_id: input.gradeId,
    reason: 'Grade initial',
    changed_by: actor.id,
  })

  await logActivity({
    actorId: actor.id,
    actorRole: actor.role,
    advisorId: userId,
    action: 'conseiller.cree',
    entityType: 'advisor',
    entityId: userId,
    details: { compteExistant: !createdAuthUser, parrain: input.sponsorId },
  })

  const access = await sendInvitation(userId, { email, prenom: input.prenom }, actor)

  return { advisorId: userId, ...access }
}

async function sendInvitation(
  advisorId: string,
  advisor: { email: string; prenom: string },
  actor: Actor,
): Promise<AccessLinkResult> {
  const access = await issueAccessLink({
    email: advisor.email,
    prenom: advisor.prenom,
    preferInvite: true,
    kind: 'invitation',
  })

  const supabase = createAdminClient()
  await supabase
    .from('advisors')
    .update({ invited_at: new Date().toISOString() })
    .eq('user_id', advisorId)

  await logActivity({
    actorId: actor.id,
    actorRole: actor.role,
    advisorId,
    action: 'conseiller.invitation_envoyee',
    details: { emailEnvoye: access.emailSent },
  })

  return access
}

// ---------- ADMIN ACTIONS ON AN ACCOUNT ----------

async function getAccountRow(advisorId: string) {
  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('advisors')
    .select('user_id, email, prenom, status, activated_at, grade_id, sponsor_id, region')
    .eq('user_id', advisorId)
    .maybeSingle()

  if (error) throw new Error(error.message)
  if (!data) throw new Error('Conseiller introuvable.')
  return data
}

/** Sends a fresh invitation to an advisor who has not activated yet. */
export async function resendInvitation(advisorId: string, actor: Actor): Promise<AccessLinkResult> {
  const row = await getAccountRow(advisorId)
  if (row.status !== 'invite') {
    throw new Error('Ce conseiller a déjà activé son compte.')
  }
  return sendInvitation(advisorId, row, actor)
}

/** Sends a password-reset link (A7). The advisor picks the new password. */
export async function sendPasswordReset(advisorId: string, actor: Actor): Promise<AccessLinkResult> {
  const row = await getAccountRow(advisorId)

  const access = await issueAccessLink({
    email: row.email,
    prenom: row.prenom,
    preferInvite: false,
    kind: 'reinitialisation',
  })

  await logActivity({
    actorId: actor.id,
    actorRole: actor.role,
    advisorId,
    action: 'conseiller.reinitialisation_envoyee',
    details: { emailEnvoye: access.emailSent },
  })

  return access
}

/**
 * Suspends or reactivates (A6). Reactivating returns the advisor to
 * wherever they were: `actif` if they had activated, `invite` if not.
 */
export async function setAdvisorSuspended(
  advisorId: string,
  suspended: boolean,
  actor: Actor,
): Promise<void> {
  const row = await getAccountRow(advisorId)

  let next: AdvisorStatus
  if (suspended) {
    if (row.status === 'suspendu') return
    next = 'suspendu'
  } else {
    if (row.status !== 'suspendu') return
    next = row.activated_at ? 'actif' : 'invite'
  }

  const supabase = createAdminClient()
  const { error } = await supabase
    .from('advisors')
    .update({
      status: next,
      suspended_at: suspended ? new Date().toISOString() : null,
    })
    .eq('user_id', advisorId)

  if (error) throw new Error(error.message)

  await logActivity({
    actorId: actor.id,
    actorRole: actor.role,
    advisorId,
    action: suspended ? 'conseiller.suspendu' : 'conseiller.reactive',
  })
}

/** Identity and region (A5 from the admin side, B9). */
export async function updateAdvisorIdentity(
  advisorId: string,
  values: { prenom: string; nom: string; telephone: string; region?: string },
  actor: Actor,
): Promise<void> {
  const row = await getAccountRow(advisorId)
  const supabase = createAdminClient()

  const { error } = await supabase.from('advisors').update(values).eq('user_id', advisorId)
  if (error) throw new Error(error.message)

  const details: Record<string, unknown> = { ...values }
  if (values.region !== undefined && values.region !== row.region) {
    details.ancienneRegion = row.region
  }

  await logActivity({
    actorId: actor.id,
    actorRole: actor.role,
    advisorId,
    action: 'conseiller.profil_modifie',
    details,
  })
}

/** Manual promotion or demotion, with a reason (F6, F8). */
export async function changeAdvisorGrade(
  advisorId: string,
  gradeId: string,
  reason: string,
  actor: Actor,
): Promise<void> {
  const row = await getAccountRow(advisorId)
  if (row.grade_id === gradeId) return

  const supabase = createAdminClient()

  const { error } = await supabase
    .from('advisors')
    .update({ grade_id: gradeId })
    .eq('user_id', advisorId)
  if (error) throw new Error(error.message)

  await supabase.from('advisor_grade_history').insert({
    advisor_id: advisorId,
    from_grade_id: row.grade_id,
    to_grade_id: gradeId,
    reason,
    changed_by: actor.id,
  })

  await logActivity({
    actorId: actor.id,
    actorRole: actor.role,
    advisorId,
    action: 'conseiller.grade_modifie',
    details: { de: row.grade_id, vers: gradeId, motif: reason },
  })
}

/**
 * Moves an advisor under another sponsor (B6). Their recruits point at
 * them, not at the old sponsor, so the whole sub-branch moves with them.
 * A move into their own sub-branch is refused by the database trigger.
 */
export async function changeAdvisorSponsor(
  advisorId: string,
  sponsorId: string | null,
  reason: string,
  actor: Actor,
): Promise<void> {
  const row = await getAccountRow(advisorId)
  if (row.sponsor_id === sponsorId) return

  const supabase = createAdminClient()

  const { error } = await supabase
    .from('advisors')
    .update({ sponsor_id: sponsorId })
    .eq('user_id', advisorId)

  if (error) {
    if (error.message.includes('advisor_cycle')) {
      throw new Error('Impossible : ce parrain fait partie de la sous-branche de ce conseiller.')
    }
    throw new Error(error.message)
  }

  await logActivity({
    actorId: actor.id,
    actorRole: actor.role,
    advisorId,
    action: 'conseiller.parrain_modifie',
    details: { de: row.sponsor_id, vers: sponsorId, motif: reason },
  })
}

// ---------- ADVISOR'S OWN ACCOUNT ----------

/** First password set: an invited advisor becomes active (A3). */
export async function markAdvisorActivated(advisorId: string): Promise<boolean> {
  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('advisors')
    .update({ status: 'actif', activated_at: new Date().toISOString() })
    .eq('user_id', advisorId)
    .eq('status', 'invite')
    .select('user_id')

  if (error) throw new Error(error.message)
  return (data ?? []).length > 0
}

// ---------- RECRUIT APPLICATIONS ----------

export async function submitApplication(
  sponsorId: string,
  values: {
    prenom: string
    nom: string
    email: string
    telephone: string
    region: string
    notes?: string
  },
): Promise<void> {
  const supabase = createAdminClient()
  const email = values.email.trim().toLowerCase()

  const { data: existing } = await supabase
    .from('advisors')
    .select('user_id')
    .eq('email', email)
    .maybeSingle()
  if (existing) {
    throw new Error('Cette personne est déjà conseillère INOCASA.')
  }

  const { data: pending } = await supabase
    .from('advisor_applications')
    .select('id')
    .eq('email', email)
    .eq('status', 'en_attente')
    .maybeSingle()
  if (pending) {
    throw new Error('Une candidature est déjà en attente pour cet email.')
  }

  const { data, error } = await supabase
    .from('advisor_applications')
    .insert({
      sponsor_id: sponsorId,
      prenom: values.prenom,
      nom: values.nom,
      email,
      telephone: values.telephone,
      region: values.region,
      notes: values.notes || null,
    })
    .select('id')
    .single()

  if (error) throw new Error(error.message)

  await logActivity({
    actorId: sponsorId,
    actorRole: 'conseiller',
    advisorId: sponsorId,
    action: 'candidature.soumise',
    entityType: 'application',
    entityId: data.id,
    details: { recrue: `${values.prenom} ${values.nom}` },
  })
}

async function getPendingApplication(applicationId: string) {
  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('advisor_applications')
    .select('id, sponsor_id, prenom, nom, email, telephone, region, status')
    .eq('id', applicationId)
    .maybeSingle()

  if (error) throw new Error(error.message)
  if (!data) throw new Error('Candidature introuvable.')
  if (data.status !== 'en_attente') throw new Error('Cette candidature a déjà été traitée.')
  return data
}

/** Accepting creates the account under the applicant's sponsor (B4, B5). */
export async function acceptApplication(
  applicationId: string,
  gradeId: string,
  actor: Actor,
): Promise<{ advisorId: string } & AccessLinkResult> {
  const application = await getPendingApplication(applicationId)

  const result = await createAdvisorAccount(
    {
      prenom: application.prenom,
      nom: application.nom,
      email: application.email,
      telephone: application.telephone,
      region: application.region,
      gradeId,
      sponsorId: application.sponsor_id,
    },
    actor,
  )

  const supabase = createAdminClient()
  await supabase
    .from('advisor_applications')
    .update({
      status: 'acceptee',
      decided_by: actor.id,
      decided_at: new Date().toISOString(),
      advisor_id: result.advisorId,
    })
    .eq('id', applicationId)

  await logActivity({
    actorId: actor.id,
    actorRole: actor.role,
    advisorId: application.sponsor_id,
    action: 'candidature.acceptee',
    entityType: 'application',
    entityId: applicationId,
    details: { recrue: `${application.prenom} ${application.nom}` },
  })

  return result
}

/** Refusing closes the application with a reason the sponsor can see. */
export async function refuseApplication(
  applicationId: string,
  reason: string,
  actor: Actor,
): Promise<void> {
  const application = await getPendingApplication(applicationId)
  const supabase = createAdminClient()

  const { error } = await supabase
    .from('advisor_applications')
    .update({
      status: 'refusee',
      decision_reason: reason,
      decided_by: actor.id,
      decided_at: new Date().toISOString(),
    })
    .eq('id', applicationId)
    .eq('status', 'en_attente')

  if (error) throw new Error(error.message)

  await logActivity({
    actorId: actor.id,
    actorRole: actor.role,
    advisorId: application.sponsor_id,
    action: 'candidature.refusee',
    entityType: 'application',
    entityId: applicationId,
    details: { recrue: `${application.prenom} ${application.nom}`, motif: reason },
  })
}
