'use client'

import { useActionState, useState } from 'react'
import {
  acceptApplicationAction,
  refuseApplicationAction,
  type AccessActionState,
  type ActionState,
} from '@/app/admin-r/(dashboard)/conseillers/actions'
import { AccessLinkNotice } from '@/components/admin/access-link-notice'
import type { Grade } from '@/lib/conseiller/format'

/**
 * Accept (with the starting grade) or refuse (with a reason the sponsor
 * will see) one pending recruit application (B4).
 */
export function ApplicationDecision({
  applicationId,
  grades,
}: {
  applicationId: string
  grades: Grade[]
}) {
  const [mode, setMode] = useState<'idle' | 'accept' | 'refuse'>('idle')
  const [acceptState, acceptAction, accepting] = useActionState(
    acceptApplicationAction.bind(null, applicationId),
    {} as AccessActionState,
  )
  const [refuseState, refuseAction, refusing] = useActionState(
    refuseApplicationAction.bind(null, applicationId),
    {} as ActionState,
  )

  if (acceptState.success && acceptState.access) {
    return <AccessLinkNotice access={acceptState.access} />
  }

  if (mode === 'accept') {
    return (
      <form action={acceptAction} className="advisor-inline-form">
        <select name="gradeId" defaultValue={grades[0]?.id ?? ''} required>
          {grades.map((grade) => (
            <option key={grade.id} value={grade.id}>
              {grade.name}
            </option>
          ))}
        </select>
        <input
          name="matricule"
          required
          inputMode="numeric"
          pattern="[0-9]{8}"
          maxLength={8}
          placeholder="Matricule (8 chiffres)"
          title="8 chiffres"
        />
        <button type="submit" className="primary-button" disabled={accepting}>
          {accepting ? 'Création…' : 'Créer le compte'}
        </button>
        <button type="button" className="outline-button" onClick={() => setMode('idle')}>
          Annuler
        </button>
        {acceptState.error ? <p className="field-error">{acceptState.error}</p> : null}
      </form>
    )
  }

  if (mode === 'refuse') {
    return (
      <form action={refuseAction} className="advisor-inline-form">
        <input name="reason" required minLength={3} placeholder="Motif du refus" autoFocus />
        <button type="submit" className="primary-button admin-danger-button" disabled={refusing}>
          {refusing ? 'Refus…' : 'Refuser'}
        </button>
        <button type="button" className="outline-button" onClick={() => setMode('idle')}>
          Annuler
        </button>
        {refuseState.error ? <p className="field-error">{refuseState.error}</p> : null}
      </form>
    )
  }

  return (
    <div className="advisor-inline-form">
      <button type="button" className="primary-button" onClick={() => setMode('accept')}>
        Accepter
      </button>
      <button type="button" className="outline-button" onClick={() => setMode('refuse')}>
        Refuser
      </button>
    </div>
  )
}
