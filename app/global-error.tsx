'use client'

import { useEffect } from 'react'

/**
 * Last-resort boundary for errors thrown by the ROOT layout itself, which
 * app/error.tsx cannot catch because it renders inside that layout.
 *
 * Next replaces the whole document here, so this must supply its own
 * <html> and <body> — and it cannot rely on anything the root layout sets
 * up (fonts, providers, globals.css is imported there). The styles are
 * therefore inline on purpose rather than a missing class.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('[app] Erreur fatale:', error)
  }, [error])

  return (
    <html lang="fr">
      <body
        style={{
          margin: 0,
          minHeight: '100vh',
          display: 'grid',
          placeItems: 'center',
          padding: '24px',
          background: '#ffffff',
          color: '#1f2328',
          fontFamily: 'system-ui, -apple-system, Segoe UI, Roboto, sans-serif',
        }}
      >
        <div style={{ maxWidth: 460, textAlign: 'center' }}>
          <h1 style={{ fontSize: 28, margin: '0 0 12px', letterSpacing: '-0.02em' }}>
            Une erreur est survenue
          </h1>
          <p style={{ color: '#6b7280', lineHeight: 1.6, margin: '0 0 24px' }}>
            Le site est momentanément indisponible. Merci de réessayer dans un instant.
          </p>
          <button
            type="button"
            onClick={reset}
            style={{
              background: '#00a758',
              color: '#ffffff',
              border: 0,
              borderRadius: 999,
              padding: '12px 24px',
              fontSize: 15,
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Réessayer
          </button>
        </div>
      </body>
    </html>
  )
}
