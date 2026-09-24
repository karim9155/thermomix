'use client'

import { useState, useTransition } from 'react'
import { Ban, KeyRound, Mail, RotateCcw } from 'lucide-react'
import {
  resendInvitationAction,
  sendPasswordResetAction,
  setSuspendedAction,
  type AccessActionState,
} from '@/app/admin-r/(dashboard)/conseillers/actions'
import { AccessLinkNotice } from '@/components/admin/access-link-notice'
import type { AdvisorStatus } from '@/lib/conseiller/format'

/**
 * Account-level actions on one advisor (A2 resend, A6, A7). Suspension
 * asks for confirmation first, the same way cancelling an order does.
 */
export function AdvisorAccountControls({
  advisorId,
  status,
}: {
  advisorId: string
  status: AdvisorStatus
}) {
  const [pending, startTransition] = useTransition()
  const [confirmSuspend, setConfirmSuspend] = useState(false)
  const [result, setResult] = useState<AccessActionState | null>(null)

  function run(action: () => Promise<AccessActionState>) {
    setResult(null)
    startTransition(async () => {
      setResult(await action())
      setConfirmSuspend(false)
    })
  }

  return (
    <div className="advisor-controls">
      {confirmSuspend ? (
        <div className="admin-status-confirm">
          <p>Suspendre ce conseiller ? Il perd l&apos;accès à son espace immédiatement.</p>
          <div className="hero-actions">
            <button
              type="button"
              className="primary-button admin-danger-button"
              disabled={pending}
              onClick={() => run(() => setSuspendedAction(advisorId, true))}
            >
              {pending ? 'Suspension…' : 'Confirmer'}
            </button>
            <button
              type="button"
              className="outline-button"
              disabled={pending}
              onClick={() => setConfirmSuspend(false)}
            >
              Annuler
            </button>
          </div>
        </div>
      ) : (
        <div className="advisor-control-buttons">
          {status === 'invite' ? (
            <button
              type="button"
              className="outline-button"
              disabled={pending}
              onClick={() => run(() => resendInvitationAction(advisorId))}
            >
              <Mail size={15} /> Renvoyer l&apos;invitation
            </button>
          ) : null}

          {status === 'actif' ? (
            <button
              type="button"
              className="outline-button"
              disabled={pending}
              onClick={() => run(() => sendPasswordResetAction(advisorId))}
            >
              <KeyRound size={15} /> Réinitialiser le mot de passe
            </button>
          ) : null}

          {status === 'suspendu' ? (
            <button
              type="button"
              className="outline-button"
              disabled={pending}
              onClick={() => run(() => setSuspendedAction(advisorId, false))}
            >
              <RotateCcw size={15} /> Réactiver
            </button>
          ) : (
            <button
              type="button"
              className="outline-button advisor-suspend-button"
              disabled={pending}
              onClick={() => setConfirmSuspend(true)}
            >
              <Ban size={15} /> Suspendre
            </button>
          )}
        </div>
      )}

      {result?.error ? <p className="field-error">{result.error}</p> : null}
      {result?.access ? <AccessLinkNotice access={result.access} /> : null}
    </div>
  )
}
