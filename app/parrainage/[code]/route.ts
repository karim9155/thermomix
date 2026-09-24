import { NextResponse, type NextRequest } from 'next/server'
import { getCustomer } from '@/lib/compte/guard'
import {
  REF_COOKIE,
  REF_COOKIE_MAX_AGE,
  VISITOR_COOKIE,
  attributeCustomer,
  encodeRefCookie,
  findAdvisorByCode,
  isPreviewBot,
  recordClick,
} from '@/lib/conseiller/affiliation'
import { safeNext } from '@/lib/compte/safe-next'

export const dynamic = 'force-dynamic'

/**
 * Where an advisor's shared link lands: /parrainage/<code>[?vers=/path]
 * (I4). Records the click, leaves the code in a cookie, and sends the
 * visitor on to the shop — or to the product the advisor linked.
 *
 * An unknown or disabled code still redirects, just without a cookie:
 * the visitor came to shop, and a dead link shouldn't be a dead end.
 */
export async function GET(request: NextRequest, { params }: { params: Promise<{ code: string }> }) {
  const { code } = await params

  // `vers` is user-controlled: only a same-site path is accepted (the same
  // rule as safeNext), and anything else lands on the shop — not on
  // safeNext's own fallback, /compte, which is no place for a shopper.
  const requested = request.nextUrl.searchParams.get('vers')
  const destination =
    requested && safeNext(requested) === requested ? requested : '/boutique'
  const response = NextResponse.redirect(new URL(destination, request.url))
  response.headers.set('X-Robots-Tag', 'noindex')

  const advisor = await findAdvisorByCode(code)
  if (!advisor) return response

  // Link previews (WhatsApp shows one for every shared link) are not
  // visitors: no click, no cookie.
  if (isPreviewBot(request.headers.get('user-agent'))) return response

  const secure = process.env.NODE_ENV === 'production'
  const now = new Date()

  // Last link opened wins: this simply overwrites any earlier code.
  response.cookies.set(REF_COOKIE, encodeRefCookie(code.trim().toUpperCase(), now), {
    httpOnly: true,
    sameSite: 'lax',
    secure,
    path: '/',
    maxAge: REF_COOKIE_MAX_AGE,
  })

  let visitorId = request.cookies.get(VISITOR_COOKIE)?.value
  if (!visitorId || !/^[a-f0-9-]{36}$/.test(visitorId)) {
    visitorId = crypto.randomUUID()
    response.cookies.set(VISITOR_COOKIE, visitorId, {
      httpOnly: true,
      sameSite: 'lax',
      secure,
      path: '/',
      maxAge: REF_COOKIE_MAX_AGE,
    })
  }

  await recordClick(advisor.id, visitorId, destination)

  // Already signed in: tie the account now, with the same click time as
  // the cookie, rather than waiting for the next sign-in or checkout.
  const customer = await getCustomer()
  if (customer && customer.id !== advisor.id) {
    await attributeCustomer(customer.id, advisor.id, now)
  }

  return response
}
