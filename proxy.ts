import { NextResponse, type NextRequest } from 'next/server'
import { createMiddlewareClient } from '@/lib/supabase/middleware'

/**
 * Three protected areas, three DIFFERENT bars, deliberately never merged:
 *
 *   /admin-r     → a session AND a matching admin_users row
 *   /conseiller  → a session AND a matching advisors row
 *   /compte      → a session, nothing more
 *
 * Customers, admins and advisors are all auth.users rows; what separates
 * them is which membership table has a row for them. Each area looks only
 * at its own table — an admin_users row grants nothing in /conseiller and
 * an advisors row grants nothing in /admin-r. That separation is the
 * security property.
 *
 * /admin-r and /conseiller are matched here (see config at the bottom).
 * This layer is an optimistic pre-filter, never the security boundary:
 * /admin-r re-verifies in lib/admin/guard.ts and /conseiller in
 * lib/conseiller/guard.ts, which also checks the advisor's STATUS
 * (suspended, not yet activated) — something this file deliberately
 * leaves alone. Next's proxy guide is explicit that proxy runs on
 * prefetches too and must not carry the whole authorization story.
 *
 * /compte is enforced solely by lib/compte/guard.ts inside each route,
 * so a new route under /compte gets NO protection from this file. It must
 * call requireCustomer() (or getCustomer()) itself.
 */

// Public entry points inside otherwise-protected areas.
//
// /conseiller/activation is where an invitation or reset link lands: the
// visitor has no session yet, the page creates one.
const PUBLIC_PATHS = new Set([
  '/admin-r/login',
  '/conseiller/connexion',
  '/conseiller/activation',
])

const AREAS = [
  { prefix: '/conseiller', table: 'advisors', login: '/conseiller/connexion' },
  { prefix: '/admin-r', table: 'admin_users', login: '/admin-r/login' },
] as const

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl

  if (PUBLIC_PATHS.has(pathname)) {
    return NextResponse.next()
  }

  const area = AREAS.find(
    ({ prefix }) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  )
  if (!area) {
    return NextResponse.next()
  }

  const { supabase, getResponse } = createMiddlewareClient(request)

  // getUser() re-validates the JWT against Supabase Auth rather than
  // trusting a decoded cookie — the correct check for a security boundary.
  const {
    data: { user },
  } = await supabase.auth.getUser()

  // The equivalent redirect for /compte — bouncing to
  // /compte/connexion?next=... so a deep link survives the detour — lives
  // in requireCustomer(), which is where it always had to work anyway for
  // prefetched and directly-hit routes.
  if (!user) {
    return NextResponse.redirect(new URL(area.login, request.url))
  }

  // Signed in is not sufficient: the account must belong to this area.
  // Both tables have a self-read RLS policy (migrations 0004 and 0013),
  // so the cookie client can answer this without the service role.
  const { data: memberRow } = await supabase
    .from(area.table)
    .select('user_id')
    .eq('user_id', user.id)
    .maybeSingle()

  if (!memberRow) {
    return NextResponse.redirect(new URL(area.login, request.url))
  }

  return getResponse()
}

export const config = {
  // /compte is deliberately NOT matched. Every route under it already
  // calls requireCustomer() or getCustomer() (page.tsx, commandes/, the
  // facture route, updateProfile), which redirects a signed-out visitor to
  // the same /compte/connexion?next=... this used to produce — so matching
  // it here bought no protection and cost every navigation an extra
  // blocking getUser() round-trip to Supabase before the page could even
  // begin rendering. /admin-r and /conseiller stay: their membership
  // lookups are worth doing before rendering, and neither is on a hot
  // customer path.
  matcher: ['/admin-r/:path*', '/conseiller', '/conseiller/:path*'],
}
