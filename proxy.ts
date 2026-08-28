import { NextResponse, type NextRequest } from 'next/server'
import { createMiddlewareClient } from '@/lib/supabase/middleware'

/**
 * Two protected areas, two DIFFERENT bars, deliberately never merged:
 *
 *   /admin-r  → a session AND a matching admin_users row
 *   /compte   → a session, nothing more
 *
 * A customer is an auth.users row with no admin_users row, so a customer
 * session clears the /compte bar and still fails the /admin-r one. The
 * admin_users lookup below is the only thing gating /admin-r and it is
 * never consulted for /compte — that separation is the security property.
 *
 * Only /admin-r is matched here (see config at the bottom). Both bars are
 * still enforced, just in different places: /admin-r pre-filters here and
 * re-verifies in lib/admin/guard.ts, while /compte is enforced solely by
 * lib/compte/guard.ts inside each route. That is not a weakening — this
 * layer was never the security boundary. It is an optimistic pre-filter;
 * every read and mutation re-verifies for itself, and Next's proxy guide
 * is explicit that proxy runs on prefetches too and must not carry the
 * whole authorization story. Dropping /compte removed a duplicated,
 * blocking getUser() from the hottest customer path.
 *
 * The corollary: a new route under /compte gets NO protection from this
 * file. It must call requireCustomer() (or getCustomer()) itself.
 */

// Public entry points inside otherwise-protected areas. The /compte ones
// that used to sit here are gone with the matcher — an unmatched path
// never reaches this function, so listing them was dead weight.
const PUBLIC_PATHS = new Set(['/admin-r/login'])

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl

  if (PUBLIC_PATHS.has(pathname)) {
    return NextResponse.next()
  }

  const { supabase, getResponse } = createMiddlewareClient(request)

  // getUser() re-validates the JWT against Supabase Auth rather than
  // trusting a decoded cookie — the correct check for a security boundary.
  const {
    data: { user },
  } = await supabase.auth.getUser()

  // Only /admin-r reaches this function now, so there is no customer
  // branch here any more. The equivalent redirect for /compte — bouncing
  // to /compte/connexion?next=... so a deep link survives the detour —
  // lives in requireCustomer(), which is where it always had to work
  // anyway for prefetched and directly-hit routes.
  if (!user) {
    return NextResponse.redirect(new URL('/admin-r/login', request.url))
  }

  // Signed in is not sufficient for the admin area.
  const { data: adminRow } = await supabase
    .from('admin_users')
    .select('user_id')
    .eq('user_id', user.id)
    .maybeSingle()

  if (!adminRow) {
    return NextResponse.redirect(new URL('/admin-r/login', request.url))
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
  // begin rendering. /admin-r stays: its admin_users lookup is worth doing
  // before rendering, and it is not on a hot customer path.
  matcher: ['/admin-r/:path*'],
}
