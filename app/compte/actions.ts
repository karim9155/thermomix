'use server'

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/customer-auth'
import { safeNext } from '@/lib/compte/safe-next'
import { requireCustomer } from '@/lib/compte/guard'
import { saveProfile } from '@/lib/compte/profile'

const credentialsSchema = z.object({
  email: z.email(),
  password: z.string().min(8, 'Le mot de passe doit contenir au moins 8 caractères.'),
})

const signupSchema = credentialsSchema.extend({
  prenom: z.string().trim().min(1, 'Prénom requis.'),
  nom: z.string().trim().min(1, 'Nom requis.'),
})

export type AuthState = { error?: string; confirmationRequired?: boolean }

const GENERIC_ERROR = 'Identifiants invalides.'

export async function signup(_prevState: AuthState, formData: FormData): Promise<AuthState> {
  const parsed = signupSchema.safeParse({
    email: formData.get('email'),
    password: formData.get('password'),
    prenom: formData.get('prenom'),
    nom: formData.get('nom'),
  })

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Données invalides.' }
  }

  const supabase = await createClient()

  // Send the confirmation link back through our own callback, which
  // exchanges the code for a session and then forwards to `next`. Without
  // emailRedirectTo the link goes to Supabase's default SITE_URL and the
  // user arrives confirmed but still signed out.
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'
  const callback = new URL('/auth/callback', siteUrl)
  callback.searchParams.set('next', safeNext(formData.get('next') as string | null))

  const { data, error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: {
      emailRedirectTo: callback.toString(),
      data: { prenom: parsed.data.prenom, nom: parsed.data.nom },
    },
  })

  if (error) {
    // Don't collapse every failure into "email already used" — that
    // sends people hunting for an account that doesn't exist. The rate
    // limit in particular is hit easily while testing, because Supabase's
    // built-in mailer allows only a few messages per hour.
    if (error.status === 429 || error.code === 'over_email_send_rate_limit') {
      return {
        error:
          "Trop de tentatives d'inscription. Merci de réessayer dans une heure, ou connectez-vous si vous avez déjà un compte.",
      }
    }

    if (error.code === 'user_already_exists' || error.code === 'email_exists') {
      return { error: 'Un compte existe déjà avec cet email. Connectez-vous.' }
    }

    if (error.code === 'weak_password') {
      return { error: 'Mot de passe trop faible. Utilisez au moins 8 caractères.' }
    }

    return { error: "Impossible de créer le compte. Merci de réessayer." }
  }

  // This project has email confirmation ON (auth settings:
  // mailer_autoconfirm = false), so signUp() returns a user with NO
  // session — the account exists but cannot act until the link in the
  // email is clicked. Redirecting here would bounce straight off the
  // proxy back to the login page with no explanation, so say what
  // happened instead. If confirmation is ever turned off, Supabase
  // returns a session and we continue to `next` as usual.
  if (!data.session) {
    return { confirmationRequired: true }
  }

  redirect(safeNext(formData.get('next') as string | null))
}

export async function signin(_prevState: AuthState, formData: FormData): Promise<AuthState> {
  const parsed = credentialsSchema.safeParse({
    email: formData.get('email'),
    password: formData.get('password'),
  })

  if (!parsed.success) {
    return { error: GENERIC_ERROR }
  }

  const supabase = await createClient()
  const { error } = await supabase.auth.signInWithPassword(parsed.data)

  if (error) {
    // Never reveal whether the email exists — same message for both cases.
    return { error: GENERIC_ERROR }
  }

  redirect(safeNext(formData.get('next') as string | null))
}

export async function signout() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  redirect('/')
}

const profileSchema = z.object({
  prenom: z.string().trim().min(1, 'Prénom requis.').max(80),
  nom: z.string().trim().min(1, 'Nom requis.').max(80),
  telephone: z.string().trim().max(30),
  adresse: z.string().trim().max(200),
  ville: z.string().trim().max(80),
  gouvernorat: z.string().trim().max(80),
})

export type ProfileState = { error?: string; success?: boolean }

export async function updateProfile(
  _prevState: ProfileState,
  formData: FormData,
): Promise<ProfileState> {
  const parsed = profileSchema.safeParse({
    prenom: formData.get('prenom'),
    nom: formData.get('nom'),
    telephone: formData.get('telephone'),
    adresse: formData.get('adresse'),
    ville: formData.get('ville'),
    gouvernorat: formData.get('gouvernorat'),
  })

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Données invalides.' }
  }

  try {
    // Identity comes from the verified session, never from the form.
    const customer = await requireCustomer('/compte')
    await saveProfile(customer.id, parsed.data)

    // Keep the auth metadata in step, since the header's initials and the
    // signup-time fallback both read from there.
    const supabase = await createClient()
    await supabase.auth.updateUser({
      data: { prenom: parsed.data.prenom, nom: parsed.data.nom },
    })
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'Une erreur est survenue.' }
  }

  revalidatePath('/compte')
  revalidatePath('/commande')

  return { success: true }
}
