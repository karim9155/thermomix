import { NextResponse, type NextRequest } from 'next/server'
import { createMiddlewareClient } from '@/lib/supabase/middleware'

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl

  if (pathname === '/admin-r/login') {
    return NextResponse.next()
  }

  const { supabase, getResponse } = createMiddlewareClient(request)

  // getUser() re-validates the JWT against Supabase Auth rather than
  // trusting a decoded cookie — the correct check for a security boundary.
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.redirect(new URL('/admin-r/login', request.url))
  }

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
  matcher: ['/admin-r/:path*'],
}
