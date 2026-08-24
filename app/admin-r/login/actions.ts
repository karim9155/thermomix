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
  const { data, error } = await supabase.auth.signInWithPassword(parsed.data)

  if (error) {
    // Never reveal whether the email exists — same message for both cases.
    return { error: GENERIC_ERROR }
  }

  // Valid credentials are not the same as admin rights: customer accounts
  // live in the same auth.users table (see migration 0006). Signing one in
  // here would leave it holding a session the proxy immediately bounces off
  // /admin-r, so check membership and sign it straight back out — with the
  // same generic message, which also avoids revealing that the account
  // exists but isn't an admin.
  const { data: adminRow } = await supabase
    .from('admin_users')
    .select('user_id')
    .eq('user_id', data.user.id)
    .maybeSingle()

  if (!adminRow) {
    await supabase.auth.signOut()
    return { error: GENERIC_ERROR }
  }

  redirect('/admin-r')
}
