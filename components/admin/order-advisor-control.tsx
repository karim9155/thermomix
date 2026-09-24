'use client'

import { useState, useTransition } from 'react'
import { reassignOrderAdvisorAction } from '@/app/admin-r/(dashboard)/livraisons/[reference]/actions'

/**
 * Who a web order is attributed to, and a way to change it (I9). Any
 * commission already earned moves with it.
 */
export function OrderAdvisorControl({
  reference,
  advisorId,
  source,
  advisors,
}: {
  reference: string
  advisorId: string | null
  source: 'lien' | 'admin' | null
  advisors: { id: string; name: string; suspended: boolean }[]
}) {
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  function change(next: string) {
    if (next === (advisorId ?? '')) return
    const name = advisors.find((advisor) => advisor.id === next)?.name
    const question = name
      ? `Attribuer cette commande à ${name} ? Une prime déjà acquise sera déplacée.`
      : 'Retirer le conseiller de cette commande ? Une prime déjà acquise sera reprise.'
    if (!window.confirm(question)) return

    setError(null)
    startTransition(async () => {
      const result = await reassignOrderAdvisorAction(reference, next)
      if (result.error) setError(result.error)
    })
  }

  return (
    <div className="admin-status-control">
      <label>
        Conseiller attribué
        <select value={advisorId ?? ''} disabled={pending} onChange={(event) => change(event.target.value)}>
          <option value="">Aucun</option>
          {advisors.map((advisor) => (
            <option key={advisor.id} value={advisor.id} disabled={advisor.suspended}>
              {advisor.name}
              {advisor.suspended ? ' (suspendu)' : ''}
            </option>
          ))}
        </select>
      </label>
      {advisorId ? (
        <p className="admin-muted advisor-table-sub">
          {source === 'admin' ? 'Attribuée manuellement' : 'Via son lien de parrainage'}
        </p>
      ) : null}
      {error ? <p className="field-error">{error}</p> : null}
    </div>
  )
}
