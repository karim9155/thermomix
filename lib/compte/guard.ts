import 'server-only'
import { cache } from 'react'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/customer-auth'

export type CustomerUser = {
  id: string
  email: string
  /** Captured at signup and stored in user_metadata; may be absent for
      accounts created before that field existed. */
  prenom: string
  nom: string
}

/**
 * Re-verifies a customer session inside a Server Component, Server Action
 * or Route Handler. The proxy is an optimistic pre-filter, NOT the security
 * boundary (see the Next.js proxy guide and lib/admin/guard.ts's note) —
 * anything that reads or returns customer data calls this itself.
 *
 * getUser() re-validates the JWT against Supabase Auth rather than trusting
 * a decoded cookie.
 *
 * Note what this deliberately does NOT check: admin_users. Being signed in
 * is all /compte requires, and that is the whole difference between the two
 * areas — requireAdmin() additionally demands an admin_users row. Keeping
 * them apart is what stops a customer account from reaching /admin-r.
 */
export async function requireCustomer(returnTo?: string): Promise<CustomerUser> {
  const user = await getUserOnce()

  if (!user) {
    const next = returnTo ? `?next=${encodeURIComponent(returnTo)}` : ''
    redirect(`/compte/connexion${next}`)
  }

  return toCustomer(user)
}

/**
 * The session lookup both guards share, memoized per request with React's
 * cache() the same way requireAdmin() is. getUser() re-validates the JWT
 * against Supabase Auth over the network, so a request that reaches both
 * guards — or calls either twice — pays for one round-trip, not two.
 *
 * Per-request only: a new request always re-validates, so a signed-out or
 * revoked session is caught immediately.
 */
const getUserOnce = cache(async () => {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  return user
})

/**
 * Session lookup that returns null instead of redirecting — for callers
 * that need to branch on being signed in (the checkout page, the header)
 * rather than demand it.
 */
export async function getCustomer(): Promise<CustomerUser | null> {
  const user = await getUserOnce()

  if (!user) return null

  return toCustomer(user)
}

type AuthUser = { id: string; email?: string; user_metadata?: Record<string, unknown> }

function toCustomer(user: AuthUser): CustomerUser {
  const meta = user.user_metadata ?? {}
  return {
    id: user.id,
    email: user.email ?? '',
    prenom: typeof meta.prenom === 'string' ? meta.prenom : '',
    nom: typeof meta.nom === 'string' ? meta.nom : '',
  }
}
