'use server'

import { redirect } from 'next/navigation'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/admin-auth'

const loginSchema = z.object({
  email: z.email(),
  password: z.string().min(1),
})

export type LoginState = { error?: string }

const GENERIC_ERROR = 'Identifiants invalides.'

export async function login(_prevState: LoginState, formData: FormData): Promise<LoginState> {
  const parsed = loginSchema.safeParse({
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

  redirect('/admin-r')
}
