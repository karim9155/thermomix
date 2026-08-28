'use client'

import Link from 'next/link'
import { ArrowRight, RotateCw } from 'lucide-react'
import { useEffect } from 'react'

/**
 * Checkout-specific boundary. The generic app/error.tsx would work, but
 * this is the one place where a customer needs to be told explicitly that
 * their order did NOT go through and their cart is still intact —
 * otherwise the safe assumption is to retry and risk ordering twice.
 *
 * The cart lives in localStorage (lib/cart-context.tsx), so it genuinely
 * does survive this; "Retour au panier" lands on a full cart.
 */
export default function CheckoutError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('[commande] Erreur de rendu du checkout:', error)
  }, [error])

  return (
    <section className="checkout-page">
      <div className="cart-empty">
        <h1>Impossible d&apos;afficher le paiement</h1>
        <p>
          Votre commande n&apos;a pas été enregistrée et votre panier est intact. Réessayez dans un
          instant — si le problème persiste, contactez-nous et nous la prendrons par téléphone.
        </p>
        {error.digest ? <p className="error-digest">Référence : {error.digest}</p> : null}
        <div className="error-actions">
          <button type="button" onClick={reset} className="primary-button">
            <RotateCw size={16} /> Réessayer
          </button>
          <Link href="/panier" className="outline-button">
            Retour au panier <ArrowRight size={16} />
          </Link>
        </div>
      </div>
    </section>
  )
}
