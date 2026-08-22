import { cache } from 'react'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY

/**
 * Cookie-based session client for the admin area (Server Components,
 * Server Actions, Route Handlers). Publishable key + the signed-in user's
 * session — subject to RLS, so it can only ever see its own admin_users
 * row (see migration 0004's self-check policy) and nothing else; every
 * actual data read/write for the dashboard goes through
 * lib/supabase/admin.ts (service-role) after this confirms who's asking.
 *
 * Deliberately separate from lib/supabase/server.ts, which stays
 * cookie-free on purpose so the public catalog remains ISR-cacheable.
 *
 * Wrapped in React's cache() so every call within the same request (e.g.
 * the dashboard layout's requireAdmin() plus a server action's own
 * requireAdmin(), which both run as part of one incoming request) reuses
 * the same client/session instead of each independently calling
 * supabase.auth.getUser(). Supabase's refresh tokens are single-use and
 * rotate on refresh; two independent clients racing to refresh the same
 * near-expiry token cause the second one to lose — the exact bug this
 * fixes (an admin action would intermittently log itself out on save).
 */
export const createClient = cache(async () => {
  if (!supabaseUrl || !publishableKey) {
    throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY.')
  }

  const cookieStore = await cookies()

  return createServerClient(supabaseUrl, publishableKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll()
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options),
          )
        } catch {
          // Called from a Server Component that can't set cookies (e.g.
          // during a page render) — the middleware refresh below covers it.
        }
      },
    },
  })
})
