import 'server-only'
import { createClient } from '@/lib/supabase/admin-auth'

export type AdminUser = {
  id: string
  email: string
}

/**
 * Re-verifies admin status inside a Server Action or Route Handler.
 * Middleware is a convenience that keeps unauthorized requests from ever
 * rendering a page — it is NOT the security boundary. Every mutation must
 * call this itself before touching data, the same way middleware does:
 * getUser() (re-validated against Supabase Auth) + an admin_users lookup
 * via the cookie session client, using the self-check RLS policy so this
 * never needs the service-role client just to answer "is this an admin?"
 *
 * Throws if the caller isn't a verified admin — callers should let that
 * propagate (Server Actions surface it as a generic error) or catch it to
 * return a French-language error to the UI.
 */
export async function requireAdmin(): Promise<AdminUser> {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    throw new Error('Non authentifié.')
  }

  const { data: adminRow } = await supabase
    .from('admin_users')
    .select('user_id')
    .eq('user_id', user.id)
    .maybeSingle()

  if (!adminRow) {
    throw new Error("Accès refusé : ce compte n'est pas administrateur.")
  }

  return { id: user.id, email: user.email ?? '' }
}
