import 'server-only'
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
 */
export function createAdminClient() {
  if (!supabaseUrl || !secretKey) {
    throw new Error(
      'Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SECRET_KEY — set SUPABASE_SECRET_KEY in .env.local.',
    )
  }

  return createSupabaseClient(supabaseUrl, secretKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
}
