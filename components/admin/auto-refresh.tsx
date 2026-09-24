'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

const timeFormatter = new Intl.DateTimeFormat('fr-TN', {
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
  timeZone: 'Africa/Tunis',
})

/**
 * Keeps a dashboard current (J4 "temps réel"): re-renders the page's
 * server data every `seconds` while the tab is visible, and right away
 * when the admin comes back to the tab. A refresh re-runs the Server
 * Components only — no full reload, no lost scroll position.
 */
export function AutoRefresh({ seconds = 60 }: { seconds?: number }) {
  const router = useRouter()
  const [updatedAt, setUpdatedAt] = useState<Date | null>(null)

  useEffect(() => {
    setUpdatedAt(new Date())

    function refresh() {
      if (document.visibilityState !== 'visible') return
      router.refresh()
      setUpdatedAt(new Date())
    }

    const timer = window.setInterval(refresh, seconds * 1000)
    document.addEventListener('visibilitychange', refresh)
    return () => {
      window.clearInterval(timer)
      document.removeEventListener('visibilitychange', refresh)
    }
  }, [router, seconds])

  return (
    <span className="auto-refresh" aria-live="polite">
      <span className="auto-refresh-dot" aria-hidden="true" />
      {updatedAt ? `Actualisé à ${timeFormatter.format(updatedAt)}` : 'En direct'}
    </span>
  )
}
