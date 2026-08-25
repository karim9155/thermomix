import { NextResponse } from 'next/server'
import { getCustomer } from '@/lib/compte/guard'

/**
 * Who is signed in, for the header's account button.
 *
 * The header lives in BoutiqueShell, which renders on statically cached
 * pages (/boutique and /boutique/[slug] are ISR with revalidate = 300).
 * Reading the session server-side there would force those pages dynamic
 * and lose that caching, so the header stays static and asks here after
 * mount instead.
 *
 * Returns only what the button needs — initials and a display name. No
 * id, no token, nothing that isn't already visible to the person holding
 * the session.
 */
export async function GET() {
  const customer = await getCustomer()

  if (!customer) {
    return NextResponse.json({ signedIn: false }, { headers: { 'Cache-Control': 'private, no-store' } })
  }

  const initials =
    [customer.prenom, customer.nom]
      .map((part) => part.trim()[0] ?? '')
      .join('')
      .toUpperCase() || (customer.email[0] ?? '?').toUpperCase()

  return NextResponse.json(
    {
      signedIn: true,
      initials,
      name: [customer.prenom, customer.nom].filter(Boolean).join(' ') || customer.email,
    },
    { headers: { 'Cache-Control': 'private, no-store' } },
  )
}
