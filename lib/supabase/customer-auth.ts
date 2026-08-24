import { cache } from 'react'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY

/**
 * Cookie-based session client for the CUSTOMER area (/compte). Same shape
 * and same publishable key as lib/supabase/admin-auth.ts — one Supabase
 * Auth system, one cookie — but kept as its own module because the two
 * areas answer different questions:
 *
 *   admin-auth.ts  → "is this user in admin_users?"  (gates /admin-r)
 *   customer-auth.ts → "is there a session at all?"  (gates /compte)
 *
 * A customer is simply an auth.users row with no admin_users row, so
 * holding a customer session grants nothing in /admin-r. Reads here are
 * subject to RLS, which is the point: migration 0006's select-only
 * policies mean this client can see the caller's own orders and nothing
 * else, so ownership is enforced by the database rather than by a WHERE
 * clause we have to remember to write.
 *
 * Wrapped in React's cache() for the same reason admin-auth.ts is: two
 * clients racing to refresh one near-expiry token makes the loser log the
 * user out. See the note in that file.
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
          // Called from a Server Component that can't set cookies — the
          // proxy's session refresh covers it.
        }
      },
    },
  })
})
