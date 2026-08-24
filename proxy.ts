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
 * This is an optimistic pre-filter, not the security boundary: it keeps
 * unauthorized requests from rendering a page, but every read and mutation
 * re-verifies for itself (lib/admin/guard.ts, lib/compte/guard.ts). Next's
 * proxy guide is explicit that proxy runs on prefetches too and must not
 * carry the whole authorization story.
 */

// Public entry points inside otherwise-protected areas.
const PUBLIC_PATHS = new Set([
  '/admin-r/login',
  '/compte/connexion',
  '/compte/inscription',
])

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

  const isAdminArea = pathname.startsWith('/admin-r')

  if (!user) {
    if (isAdminArea) {
      return NextResponse.redirect(new URL('/admin-r/login', request.url))
    }
    // Send the customer back where they were headed after signing in, so
    // a deep link (or checkout) isn't lost to the login detour.
    const loginUrl = new URL('/compte/connexion', request.url)
    loginUrl.searchParams.set('next', pathname)
    return NextResponse.redirect(loginUrl)
  }

  // Admin area only: signed in is not sufficient.
  if (isAdminArea) {
    const { data: adminRow } = await supabase
      .from('admin_users')
      .select('user_id')
      .eq('user_id', user.id)
      .maybeSingle()

    if (!adminRow) {
      return NextResponse.redirect(new URL('/admin-r/login', request.url))
    }
  }

  return getResponse()
}

export const config = {
  matcher: ['/admin-r/:path*', '/compte/:path*'],
}
