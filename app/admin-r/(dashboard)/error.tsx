'use client'

import { RotateCw } from 'lucide-react'
import { useEffect } from 'react'

/**
 * Admin-side boundary. Unlike the storefront one this shows the actual
 * error message: the audience is the shop owner, the messages are already
 * written in French for them (lib/admin/*.ts), and knowing WHICH operation
 * failed is what makes the difference between retrying and calling for
 * help. Nothing here is customer-facing.
 */
export default function AdminError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('[admin] Erreur de rendu:', error)
  }, [error])

  return (
    <div className="admin-page">
      <h1>Une erreur est survenue</h1>
      <p style={{ color: 'var(--muted)', maxWidth: 560, lineHeight: 1.6 }}>
        {error.message || "Impossible d'afficher cette page."}
      </p>
      {error.digest ? <p className="error-digest">Référence : {error.digest}</p> : null}
      <div className="error-actions" style={{ marginTop: 20 }}>
        <button type="button" onClick={reset} className="primary-button">
          <RotateCw size={16} /> Réessayer
        </button>
      </div>
    </div>
  )
}
