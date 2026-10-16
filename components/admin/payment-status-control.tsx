'use client'

import { useState, useTransition } from 'react'
import { updatePaymentStatusAction } from '@/app/admin-r/(dashboard)/livraisons/[reference]/actions'
import type { PaymentStatus } from '@/lib/admin/order-format'

/**
 * Paid / not paid for a web order, set by hand once the money is in.
 * Marking an affiliated order paid is what releases the advisor's
 * commission, so it is never inferred from delivery.
 */
export function PaymentStatusControl({
  reference,
  currentStatus,
}: {
  reference: string
  currentStatus: PaymentStatus
}) {
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  function handleChange(value: string) {
    setError(null)
    startTransition(async () => {
      const result = await updatePaymentStatusAction(reference, value === 'payee')
      if (result.error) {
        setError(result.error)
      }
    })
  }

  return (
    <div className="admin-status-control">
      <label>
        Statut de paiement
        <select
          value={currentStatus === 'payee' ? 'payee' : 'en_attente'}
          disabled={pending || currentStatus === 'annulee'}
          onChange={(event) => handleChange(event.target.value)}
        >
          <option value="en_attente">Non payée</option>
          <option value="payee">Payée</option>
        </select>
      </label>
      {error ? <p className="field-error">{error}</p> : null}
    </div>
  )
}
