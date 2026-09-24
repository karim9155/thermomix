'use server'

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/advisor-auth'
import { requireAdvisor } from '@/lib/conseiller/guard'
import { logActivity } from '@/lib/conseiller/activity'
import {
  markAdvisorActivated,
  submitApplication,
  updateAdvisorIdentity,
} from '@/lib/conseiller/accounts'
import { applicationSchema, ownProfileSchema, passwordSchema } from '@/lib/conseiller/format'

export type FormState = { error?: string; success?: boolean }

// ---------- SIGN IN / OUT ----------

const credentialsSchema = z.object({
  email: z.email(),
  password: z.string().min(1),
})

const GENERIC_ERROR = 'Identifiants invalides.'

export async function advisorLogin(_prevState: FormState, formData: FormData): Promise<FormState> {
  const parsed = credentialsSchema.safeParse({
    email: formData.get('email'),
    password: formData.get('password'),
  })

  if (!parsed.success) {
    return { error: GENERIC_ERROR }
  }

  const supabase = await createClient()
  const { data, error } = await supabase.auth.signInWithPassword(parsed.data)

  if (error) {
    // Never reveal whether the email exists — same message for both cases.
    return { error: GENERIC_ERROR }
  }

  // Valid credentials are not the same as an advisor account: customers
  // and admins live in the same auth.users table. Same treatment as the
  // admin login — sign them straight back out, with the generic message.
  const { data: advisor } = await supabase
    .from('advisors')
    .select('status')
    .eq('user_id', data.user.id)
    .maybeSingle()

  if (!advisor) {
    await supabase.auth.signOut()
    return { error: GENERIC_ERROR }
  }

  // The password was right, so saying why they can't come in reveals
  // nothing an attacker didn't already have.
  if (advisor.status === 'suspendu') {
    await supabase.auth.signOut()
    return { error: "Votre compte conseiller est suspendu. Contactez l'administration." }
  }

  // An account still marked `invite` that signs in with a password is a
  // customer account the admin linked as an advisor: they already own a
  // password, so signing in with it is proof enough to activate.
  if (advisor.status === 'invite') {
    await markAdvisorActivated(data.user.id)
    await logActivity({
      actorId: data.user.id,
      actorRole: 'conseiller',
      advisorId: data.user.id,
      action: 'conseiller.active',
    })
  }

  await logActivity({
    actorId: data.user.id,
    actorRole: 'conseiller',
    advisorId: data.user.id,
    action: 'conseiller.connexion',
  })

  redirect('/conseiller')
}

export async function advisorLogout() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (user) {
    await logActivity({
      actorId: user.id,
      actorRole: 'conseiller',
      advisorId: user.id,
      action: 'conseiller.deconnexion',
    })
  }

  await supabase.auth.signOut()
  redirect('/conseiller/connexion')
}

// ---------- ACTIVATION LINK ----------

/**
 * Exchanges the one-time token from an invitation or reset email for a
 * session. Runs on a button press, never on page load: mail scanners
 * that pre-open links would otherwise spend the token first.
 */
export async function activateAccess(_prevState: FormState, formData: FormData): Promise<FormState> {
  const tokenHash = String(formData.get('token_hash') ?? '')
  const type = formData.get('type') === 'invite' ? 'invite' : 'recovery'

  if (!tokenHash) {
    return { error: 'Lien incomplet. Utilisez le lien reçu par email.' }
  }

  const supabase = await createClient()
  const { error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type })

  if (error) {
    return {
      error:
        "Ce lien n'est plus valide (déjà utilisé ou expiré). Demandez un nouveau lien à l'administration.",
    }
  }

  redirect('/conseiller/mot-de-passe')
}

// ---------- PASSWORD ----------

export async function setAdvisorPassword(
  _prevState: FormState,
  formData: FormData,
): Promise<FormState> {
  const parsed = passwordSchema.safeParse({
    password: formData.get('password'),
    confirm: formData.get('confirm'),
  })

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Mot de passe invalide.' }
  }

  try {
    const advisor = await requireAdvisor({ allowPending: true })

    const supabase = await createClient()
    const { error } = await supabase.auth.updateUser({ password: parsed.data.password })
    if (error) {
      if (error.code === 'same_password') {
        return { error: "Choisissez un mot de passe différent de l'ancien." }
      }
      if (error.code === 'weak_password') {
        return { error: 'Mot de passe trop faible. Utilisez au moins 8 caractères.' }
      }
      return { error: 'Impossible de définir le mot de passe. Merci de réessayer.' }
    }

    await logActivity({
      actorId: advisor.id,
      actorRole: 'conseiller',
      advisorId: advisor.id,
      action: 'conseiller.mot_de_passe_defini',
    })

    if (await markAdvisorActivated(advisor.id)) {
      await logActivity({
        actorId: advisor.id,
        actorRole: 'conseiller',
        advisorId: advisor.id,
        action: 'conseiller.active',
      })
    }
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'Une erreur est survenue.' }
  }

  redirect('/conseiller')
}

// ---------- PROFILE ----------

export async function updateOwnProfile(
  _prevState: FormState,
  formData: FormData,
): Promise<FormState> {
  const parsed = ownProfileSchema.safeParse({
    prenom: formData.get('prenom'),
    nom: formData.get('nom'),
    telephone: formData.get('telephone'),
  })

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Données invalides.' }
  }

  try {
    // Identity comes from the verified session, never from the form.
    const advisor = await requireAdvisor()
    await updateAdvisorIdentity(advisor.id, parsed.data, {
      id: advisor.id,
      role: 'conseiller',
    })
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'Une erreur est survenue.' }
  }

  revalidatePath('/conseiller', 'layout')
  return { success: true }
}

// ---------- RECRUIT APPLICATION ----------

export async function submitRecruitApplication(
  _prevState: FormState,
  formData: FormData,
): Promise<FormState> {
  const parsed = applicationSchema.safeParse({
    prenom: formData.get('prenom'),
    nom: formData.get('nom'),
    email: formData.get('email'),
    telephone: formData.get('telephone'),
    region: formData.get('region'),
    notes: formData.get('notes') ?? '',
  })

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Données invalides.' }
  }

  try {
    // The sponsor is the signed-in advisor — never a form field.
    const advisor = await requireAdvisor()
    await submitApplication(advisor.id, parsed.data)
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'Une erreur est survenue.' }
  }

  revalidatePath('/conseiller/reseau')
  revalidatePath('/admin-r/conseillers/candidatures')
  return { success: true }
}
