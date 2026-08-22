'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { updateDeliveryStatusAction } from '@/app/admin-r/(dashboard)/livraisons/[reference]/actions'
import { DELIVERY_STATUSES, type DeliveryStatus } from '@/lib/admin/order-format'

const LABELS: Record<DeliveryStatus, string> = {
  en_preparation: 'En préparation',
  en_cours_de_livraison: 'En cours de livraison',
  livree: 'Livrée',
  annulee: 'Annulée',
}

export function DeliveryStatusControl({
  reference,
  currentStatus,
}: {
  reference: string
  currentStatus: DeliveryStatus
}) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [pendingStatus, setPendingStatus] = useState<DeliveryStatus | null>(null)
  const [error, setError] = useState<string | null>(null)

  function applyStatus(newStatus: DeliveryStatus) {
    setError(null)
    startTransition(async () => {
      const result = await updateDeliveryStatusAction(reference, newStatus)
      if (result.error) {
        setError(result.error)
      } else {
        router.refresh()
      }
      setPendingStatus(null)
    })
  }

  function handleChange(value: DeliveryStatus) {
    if (value === currentStatus) return
    if (value === 'annulee') {
      setPendingStatus(value)
      return
    }
    applyStatus(value)
  }

  if (pendingStatus === 'annulee') {
    return (
      <div className="admin-status-confirm">
        <p>Confirmer l&apos;annulation de cette commande ?</p>
        <div className="hero-actions">
          <button
            type="button"
            className="primary-button"
            disabled={pending}
            onClick={() => applyStatus('annulee')}
          >
            {pending ? 'Annulation…' : "Confirmer l'annulation"}
          </button>
          <button
            type="button"
            className="outline-button"
            disabled={pending}
            onClick={() => setPendingStatus(null)}
          >
            Annuler
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="admin-status-control">
      <label>
        Statut de livraison
        <select
          value={currentStatus}
          disabled={pending}
          onChange={(event) => handleChange(event.target.value as DeliveryStatus)}
        >
          {DELIVERY_STATUSES.map((status) => (
            <option key={status} value={status}>
              {LABELS[status]}
            </option>
          ))}
        </select>
      </label>
      {error ? <p className="field-error">{error}</p> : null}
    </div>
  )
}
