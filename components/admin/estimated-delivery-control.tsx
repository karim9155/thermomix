'use client'

import { useEffect, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { updateEstimatedDeliveryAction } from '@/app/admin-r/(dashboard)/livraisons/[reference]/actions'

/**
 * Free-text delivery estimate ("2–3 jours", "Lundi 15"). Unlike the status
 * dropdown beside it, a text field has no natural "committed" moment, so
 * this saves explicitly and only when the value actually changed.
 */
export function EstimatedDeliveryControl({
  reference,
  currentValue,
}: {
  reference: string
  currentValue: string | null
}) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [value, setValue] = useState(currentValue ?? '')
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)

  // A successful save revalidates and re-renders this with a new
  // currentValue; adopt it so the field doesn't keep stale local state.
  useEffect(() => {
    setValue(currentValue ?? '')
  }, [currentValue])

  const dirty = value.trim() !== (currentValue ?? '')

  function handleSave() {
    if (!dirty) return
    setError(null)
    setSaved(false)
    startTransition(async () => {
      const result = await updateEstimatedDeliveryAction(reference, value)
      if (result.error) {
        setError(result.error)
      } else {
        setSaved(true)
        router.refresh()
      }
    })
  }

  return (
    <div className="admin-estimate-control">
      <label>
        Délai de livraison estimé
        <input
          type="text"
          value={value}
          placeholder="ex. 2–3 jours"
          disabled={pending}
          maxLength={80}
          onChange={(event) => {
            setValue(event.target.value)
            setSaved(false)
          }}
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              event.preventDefault()
              handleSave()
            }
          }}
        />
      </label>
      <button
        type="button"
        className="outline-button"
        disabled={pending || !dirty}
        onClick={handleSave}
      >
        {pending ? 'Enregistrement…' : 'Enregistrer'}
      </button>
      {error ? <p className="field-error">{error}</p> : null}
      {saved && !dirty && !error ? <p className="admin-estimate-saved">Enregistré.</p> : null}
    </div>
  )
}
