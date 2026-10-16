'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { requireAdmin } from '@/lib/admin/guard'
import {
  acceptApplication,
  changeAdvisorGrade,
  changeAdvisorSponsor,
  createAdvisorAccount,
  refuseApplication,
  resendInvitation,
  sendPasswordReset,
  setAdvisorSuspended,
  updateAdvisorIdentity,
  type AccessLinkResult,
} from '@/lib/conseiller/accounts'
import { createAdvisorSchema, matriculeField, updateAdvisorSchema } from '@/lib/conseiller/format'
import { regenerateAffiliateCode, setAffiliateCodeActive } from '@/lib/conseiller/affiliation'

export type ActionState = { error?: string; success?: boolean }

/** Returned when an action produced a one-time access link for the admin. */
export type AccessActionState = ActionState & {
  access?: AccessLinkResult
  advisorId?: string
}

function message(error: unknown): string {
  return error instanceof Error ? error.message : 'Une erreur est survenue.'
}

function revalidateAdvisor(advisorId?: string) {
  revalidatePath('/admin-r/conseillers')
  revalidatePath('/admin-r/conseillers/reseau')
  if (advisorId) revalidatePath(`/admin-r/conseillers/${advisorId}`)
}

const adminActor = async () => {
  const admin = await requireAdmin()
  return { id: admin.id, role: 'admin' as const }
}

const reasonSchema = z.string().trim().min(3, 'Indiquez un motif (3 caractères minimum).').max(500)

// ---------- CREATE ----------

export async function createAdvisorAction(
  _prevState: AccessActionState,
  formData: FormData,
): Promise<AccessActionState> {
  const parsed = createAdvisorSchema.safeParse({
    prenom: formData.get('prenom'),
    nom: formData.get('nom'),
    email: formData.get('email'),
    telephone: formData.get('telephone'),
    matricule: formData.get('matricule'),
    region: formData.get('region'),
    gradeId: formData.get('gradeId'),
    sponsorId: formData.get('sponsorId') ?? '',
  })

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Le formulaire contient des erreurs.' }
  }

  try {
    const actor = await adminActor()
    const { advisorId, ...access } = await createAdvisorAccount(
      { ...parsed.data, sponsorId: parsed.data.sponsorId || null },
      actor,
    )
    revalidateAdvisor(advisorId)
    return { success: true, advisorId, access }
  } catch (error) {
    return { error: message(error) }
  }
}

// ---------- ACCOUNT ----------

export async function resendInvitationAction(advisorId: string): Promise<AccessActionState> {
  try {
    const access = await resendInvitation(advisorId, await adminActor())
    revalidateAdvisor(advisorId)
    return { success: true, access }
  } catch (error) {
    return { error: message(error) }
  }
}

export async function sendPasswordResetAction(advisorId: string): Promise<AccessActionState> {
  try {
    const access = await sendPasswordReset(advisorId, await adminActor())
    revalidateAdvisor(advisorId)
    return { success: true, access }
  } catch (error) {
    return { error: message(error) }
  }
}

export async function setSuspendedAction(
  advisorId: string,
  suspended: boolean,
): Promise<ActionState> {
  try {
    await setAdvisorSuspended(advisorId, suspended, await adminActor())
  } catch (error) {
    return { error: message(error) }
  }
  revalidateAdvisor(advisorId)
  return { success: true }
}

export async function updateAdvisorAction(
  advisorId: string,
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = updateAdvisorSchema.safeParse({
    prenom: formData.get('prenom'),
    nom: formData.get('nom'),
    telephone: formData.get('telephone'),
    region: formData.get('region'),
  })

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Le formulaire contient des erreurs.' }
  }

  try {
    await updateAdvisorIdentity(advisorId, parsed.data, await adminActor())
  } catch (error) {
    return { error: message(error) }
  }
  revalidateAdvisor(advisorId)
  return { success: true }
}

export async function changeGradeAction(
  advisorId: string,
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = z
    .object({ gradeId: z.uuid('Veuillez choisir un grade.'), reason: reasonSchema })
    .safeParse({ gradeId: formData.get('gradeId'), reason: formData.get('reason') })

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Données invalides.' }
  }

  try {
    await changeAdvisorGrade(advisorId, parsed.data.gradeId, parsed.data.reason, await adminActor())
  } catch (error) {
    return { error: message(error) }
  }
  revalidateAdvisor(advisorId)
  return { success: true }
}

export async function changeSponsorAction(
  advisorId: string,
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = z
    .object({ sponsorId: z.uuid().or(z.literal('')), reason: reasonSchema })
    .safeParse({ sponsorId: formData.get('sponsorId') ?? '', reason: formData.get('reason') })

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Données invalides.' }
  }

  try {
    await changeAdvisorSponsor(
      advisorId,
      parsed.data.sponsorId || null,
      parsed.data.reason,
      await adminActor(),
    )
  } catch (error) {
    return { error: message(error) }
  }
  revalidateAdvisor(advisorId)
  return { success: true }
}

// ---------- APPLICATIONS ----------

export async function acceptApplicationAction(
  applicationId: string,
  _prevState: AccessActionState,
  formData: FormData,
): Promise<AccessActionState> {
  const gradeId = z.uuid().safeParse(formData.get('gradeId'))
  if (!gradeId.success) {
    return { error: 'Veuillez choisir un grade.' }
  }

  const matricule = matriculeField.safeParse(formData.get('matricule'))
  if (!matricule.success) {
    return { error: matricule.error.issues[0]?.message ?? 'Matricule invalide.' }
  }

  try {
    const { advisorId, ...access } = await acceptApplication(
      applicationId,
      gradeId.data,
      matricule.data,
      await adminActor(),
    )
    revalidatePath('/admin-r/conseillers/candidatures')
    revalidateAdvisor(advisorId)
    return { success: true, advisorId, access }
  } catch (error) {
    return { error: message(error) }
  }
}

export async function refuseApplicationAction(
  applicationId: string,
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const reason = reasonSchema.safeParse(formData.get('reason'))
  if (!reason.success) {
    return { error: reason.error.issues[0]?.message ?? 'Motif invalide.' }
  }

  try {
    await refuseApplication(applicationId, reason.data, await adminActor())
  } catch (error) {
    return { error: message(error) }
  }
  revalidatePath('/admin-r/conseillers/candidatures')
  return { success: true }
}

// ---------- AFFILIATE CODE (I10) ----------

export async function regenerateCodeAction(advisorId: string): Promise<ActionState> {
  try {
    await regenerateAffiliateCode(advisorId, await adminActor())
  } catch (error) {
    return { error: message(error) }
  }
  revalidateAdvisor(advisorId)
  revalidatePath('/conseiller/parrainage')
  return { success: true }
}

export async function setCodeActiveAction(advisorId: string, active: boolean): Promise<ActionState> {
  try {
    await setAffiliateCodeActive(advisorId, active, await adminActor())
  } catch (error) {
    return { error: message(error) }
  }
  revalidateAdvisor(advisorId)
  revalidatePath('/conseiller/parrainage')
  return { success: true }
}
