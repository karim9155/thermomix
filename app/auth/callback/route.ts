import { NextResponse, type NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/customer-auth'
import { safeNext } from '@/lib/compte/safe-next'

/**
 * Lands the user after they click the link in a Supabase auth email
 * (signup confirmation, and any future magic-link or recovery flow).
 *
 * The link carries a one-time `code` that still has to be exchanged for a
 * session. Without this route the confirmation link just dropped the user
 * on the site with the account activated but STILL SIGNED OUT, which
 * looked broken right after "check your email". Exchanging it here signs
 * them in and sends them on to wherever they were headed.
 *
 * `next` is user-controlled (it round-trips through the email link), so it
 * goes through safeNext() — same open-redirect guard as the login pages.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl
  const code = searchParams.get('code')
  const next = safeNext(searchParams.get('next'))

  // Supabase reports a rejected link (expired or already used) by putting
  // the reason in the query string rather than failing the redirect.
  const errorDescription = searchParams.get('error_description')
  if (errorDescription) {
    const url = new URL('/compte/connexion', origin)
    url.searchParams.set('erreur', 'lien')
    return NextResponse.redirect(url)
  }

  if (!code) {
    return NextResponse.redirect(new URL('/compte/connexion', origin))
  }

  const supabase = await createClient()
  const { error } = await supabase.auth.exchangeCodeForSession(code)

  if (error) {
    const url = new URL('/compte/connexion', origin)
    url.searchParams.set('erreur', 'lien')
    return NextResponse.redirect(url)
  }

  return NextResponse.redirect(new URL(next, origin))
}
