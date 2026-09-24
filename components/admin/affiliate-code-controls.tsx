'use client'

import { useState, useTransition } from 'react'
import { Power, RefreshCw } from 'lucide-react'
import {
  regenerateCodeAction,
  setCodeActiveAction,
} from '@/app/admin-r/(dashboard)/conseillers/actions'

/** Regenerate or switch off an advisor's affiliate code (I10). */
export function AffiliateCodeControls({ advisorId, active }: { advisorId: string; active: boolean }) {
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  function run(question: string, action: () => Promise<{ error?: string }>) {
    if (!window.confirm(question)) return
    setError(null)
    startTransition(async () => {
      const result = await action()
      if (result.error) setError(result.error)
    })
  }

  return (
    <div className="advisor-inline-form advisor-code-controls">
      <button
        type="button"
        className="outline-button advisor-small-button"
        disabled={pending}
        onClick={() =>
          run(
            "Générer un nouveau code ? L'ancien lien cessera de fonctionner. Les clients déjà rattachés le restent.",
            () => regenerateCodeAction(advisorId),
          )
        }
      >
        <RefreshCw size={14} /> Régénérer
      </button>
      <button
        type="button"
        className="outline-button advisor-small-button"
        disabled={pending}
        onClick={() =>
          run(
            active
              ? 'Désactiver ce code ? Son lien ne rattachera plus personne et ses nouvelles commandes en ligne ne lui seront plus attribuées.'
              : 'Réactiver ce code ?',
            () => setCodeActiveAction(advisorId, !active),
          )
        }
      >
        <Power size={14} /> {active ? 'Désactiver' : 'Réactiver'}
      </button>
      {error ? <p className="field-error">{error}</p> : null}
    </div>
  )
}
