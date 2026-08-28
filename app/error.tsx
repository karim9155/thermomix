'use client'

import Link from 'next/link'
import { ArrowRight, RotateCw } from 'lucide-react'
import { useEffect } from 'react'

/**
 * Catches anything thrown while rendering a route below the root layout.
 *
 * The data layer throws freely on a failed query (lib/orders.ts,
 * lib/products.ts, lib/compte/*), which is the right shape for a server
 * component — but without this boundary a transient Supabase blip showed
 * the customer Next's raw error screen. reset() re-renders the segment,
 * which is usually all a transient failure needs.
 *
 * Deliberately no error.message in the UI: those strings carry table and
 * column names. The digest is logged server-side by Next and shown here so
 * a customer can quote it to support.
 */
export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('[app] Erreur de rendu:', error)
  }, [error])

  return (
    <section className="checkout-page">
      <div className="cart-empty">
        <h1>Une erreur est survenue</h1>
        <p>
          Nous n&apos;avons pas pu afficher cette page. Réessayez dans un instant — si le problème
          persiste, contactez-nous.
        </p>
        {error.digest ? <p className="error-digest">Référence : {error.digest}</p> : null}
        <div className="error-actions">
          <button type="button" onClick={reset} className="primary-button">
            <RotateCw size={16} /> Réessayer
          </button>
          <Link href="/boutique" className="outline-button">
            Retour à la boutique <ArrowRight size={16} />
          </Link>
        </div>
      </div>
    </section>
  )
}
