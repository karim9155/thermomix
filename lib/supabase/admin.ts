import 'server-only'
import { cache } from 'react'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const secretKey = process.env.SUPABASE_SECRET_KEY

/**
 * Secret-key client. Bypasses RLS — this is the ONLY client allowed to read
 * or write orders/order_items, which have no anon policies at all.
 *
 * Server-only: the `import 'server-only'` above makes bundling this into a
 * 'use client' file a build error, and SUPABASE_SECRET_KEY is never prefixed
 * with NEXT_PUBLIC_, so it is never exposed to the browser.
 *
 * Wrapped in React's cache() like the two cookie clients, so one request
 * builds one client instead of one per call site — the admin dashboard
 * alone calls this five times per render. This client is stateless and
 * carries no session (persistSession/autoRefreshToken are both off), so
 * sharing it within a request is purely a saving: there is no token to
 * race over, which is the reason the cookie clients are cached.
 */
export const createAdminClient = cache(() => {
  if (!supabaseUrl || !secretKey) {
    throw new Error(
      'Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SECRET_KEY — set SUPABASE_SECRET_KEY in .env.local.',
    )
  }

  return createSupabaseClient(supabaseUrl, secretKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
})
