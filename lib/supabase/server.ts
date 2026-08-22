import { createClient as createSupabaseClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY

/**
 * Publishable-key client for Server Component / Route Handler / build-time
 * reads. Subject to RLS — only ever sees what "anon" policies allow (the
 * public catalog). Never use this for orders/order_items; use
 * lib/supabase/admin.ts for those.
 *
 * Deliberately cookie-free: this app has no user session to sync, and
 * calling next/headers' cookies() (the usual Supabase/Next.js SSR pattern)
 * is a "dynamic API" that forces every route touching it out of static/ISR
 * rendering — which would silently break `export const revalidate = 300`
 * on the catalog pages. A plain client avoids that and also works at build
 * time inside generateStaticParams, where there is no request to read
 * cookies from anyway.
 */
export async function createClient() {
  if (!supabaseUrl || !publishableKey) {
    throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY.')
  }

  return createSupabaseClient(supabaseUrl, publishableKey)
}
