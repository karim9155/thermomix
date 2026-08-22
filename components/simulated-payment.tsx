'use client'

import { useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { CreditCard } from 'lucide-react'

export function SimulatedPayment() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const reference = searchParams.get('ref') ?? ''
  const [pending, setPending] = useState<'payee' | 'annulee' | null>(null)

  async function resolvePayment(status: 'payee' | 'annulee') {
    setPending(status)
    try {
      await fetch('/api/paiement/webhook', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reference, status }),
      })
    } finally {
      if (status === 'payee') {
        router.push(`/commande/confirmation?ref=${reference}`)
      } else {
        router.push(`/commande/echec?ref=${reference}`)
      }
    }
  }

  return (
    <section className="checkout-page">
      <div className="payment-stub">
        <CreditCard size={32} />
        <h1>Paiement en ligne simulé.</h1>
        <p>
          Cette page simule un fournisseur de paiement pour la commande{' '}
          <strong>{reference || '—'}</strong>. Aucun paiement réel n&apos;est effectué.
        </p>
        <div className="hero-actions">
          <button
            type="button"
            className="primary-button"
            disabled={!reference || pending !== null}
            onClick={() => resolvePayment('payee')}
          >
            {pending === 'payee' ? 'Confirmation…' : 'Simuler un paiement réussi'}
          </button>
          <button
            type="button"
            className="outline-button"
            disabled={!reference || pending !== null}
            onClick={() => resolvePayment('annulee')}
          >
            {pending === 'annulee' ? 'Traitement…' : 'Simuler un échec'}
          </button>
        </div>
      </div>
    </section>
  )
}
