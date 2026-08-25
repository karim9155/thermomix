'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'
import { User } from 'lucide-react'

type Me = { signedIn: boolean; initials?: string; name?: string }

/**
 * Account control in the header: the generic person icon when signed out,
 * the customer's initials once signed in.
 *
 * The session is fetched after mount rather than rendered on the server,
 * because this sits in BoutiqueShell and /boutique is statically cached —
 * reading cookies during render would make those pages dynamic. Until the
 * answer arrives the icon shows, which is also what a signed-out visitor
 * ends up with, so there is no flash of the wrong state for them.
 */
export function AccountButton() {
  const pathname = usePathname()
  const [me, setMe] = useState<Me | null>(null)

  // Re-check on navigation so signing in or out updates the button
  // without a hard reload.
  useEffect(() => {
    let cancelled = false

    fetch('/api/compte/moi')
      .then((r) => (r.ok ? r.json() : { signedIn: false }))
      .then((data: Me) => {
        if (!cancelled) setMe(data)
      })
      .catch(() => {
        // Offline or the route failed — leave the icon in place.
        if (!cancelled) setMe({ signedIn: false })
      })

    return () => {
      cancelled = true
    }
  }, [pathname])

  if (me?.signedIn && me.initials) {
    return (
      <Link
        href="/compte"
        className="account-initials"
        aria-label={`Mon compte — ${me.name ?? ''}`}
        title={me.name}
      >
        {me.initials}
      </Link>
    )
  }

  return (
    <Link href="/compte" className="icon-button" aria-label="Mon compte">
      <User size={20} />
    </Link>
  )
}
