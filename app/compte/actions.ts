'use server'

import { redirect } from 'next/navigation'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/customer-auth'
import { safeNext } from '@/lib/compte/safe-next'

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
  const { data, error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: {
      data: { prenom: parsed.data.prenom, nom: parsed.data.nom },
    },
  })

  if (error) {
    return { error: "Impossible de créer le compte. Cet email est peut-être déjà utilisé." }
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
