'use client'

import { useState, useTransition } from 'react'
import { EyeOff, Send, Trash2, Trophy } from 'lucide-react'
import {
  closeChallengeAction,
  deleteChallengeAction,
  setChallengePublishedAction,
} from '@/app/admin-r/(dashboard)/challenges/actions'
import { formatAmount, formatScore, type Challenge, type RankingRow } from '@/lib/conseiller/format'

function useRunner() {
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  function run(question: string | null, action: () => Promise<{ error?: string } | undefined>) {
    if (question && !window.confirm(question)) return
    setError(null)
    startTransition(async () => {
      const result = await action()
      if (result?.error) setError(result.error)
    })
  }
  return { pending, error, run }
}

/** Publish, unpublish or delete (H2). */
export function ChallengeStatusControls({ challenge }: { challenge: Challenge }) {
  const { pending, error, run } = useRunner()

  return (
    <div className="advisor-control-buttons">
      {challenge.status === 'brouillon' ? (
        <>
          <button
            type="button"
            className="primary-button"
            disabled={pending}
            onClick={() =>
              run('Publier ce challenge sur le mur de tous les conseillers ?', () =>
                setChallengePublishedAction(challenge.id, true),
              )
            }
          >
            <Send size={15} /> Publier
          </button>
          <button
            type="button"
            className="outline-button advisor-suspend-button"
            disabled={pending}
            onClick={() =>
              run('Supprimer définitivement ce brouillon ?', () => deleteChallengeAction(challenge.id))
            }
          >
            <Trash2 size={15} /> Supprimer
          </button>
        </>
      ) : null}
      {challenge.status === 'publie' ? (
        <button
          type="button"
          className="outline-button"
          disabled={pending}
          onClick={() =>
            run('Retirer ce challenge du mur des conseillers ?', () =>
              setChallengePublishedAction(challenge.id, false),
            )
          }
        >
          <EyeOff size={15} /> Dépublier
        </button>
      ) : null}
      {error ? <p className="field-error">{error}</p> : null}
    </div>
  )
}

/**
 * Closing (H6): the ranking with the rule's winners pre-ticked. The admin
 * can adjust before confirming; prizes are paid at that moment.
 */
export function CloseChallengePanel({
  challenge,
  ranking,
  proposedIds,
}: {
  challenge: Challenge
  ranking: RankingRow[]
  proposedIds: string[]
}) {
  const [selected, setSelected] = useState<Set<string>>(new Set(proposedIds))
  const { pending, error, run } = useRunner()
  const contenders = ranking.filter((row) => row.score > 0)

  function toggle(id: string) {
    setSelected((current) => {
      const next = new Set(current)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const total = selected.size * challenge.prizeAmount

  return (
    <div className="advisor-stack-form">
      {contenders.length === 0 ? (
        <p className="admin-empty">Personne n&apos;a marqué de point : le challenge sera clôturé sans gagnant.</p>
      ) : (
        <ul className="challenge-close-list">
          {contenders.map((row) => (
            <li key={row.advisorId}>
              <label className="admin-checkbox">
                <input
                  type="checkbox"
                  checked={selected.has(row.advisorId)}
                  onChange={() => toggle(row.advisorId)}
                />
                <span>
                  {row.rank}. {row.name}
                </span>
              </label>
              <strong>{formatScore(challenge.metric, row.score)}</strong>
              {!row.reachedTarget ? <span className="admin-muted">seuil non atteint</span> : null}
            </li>
          ))}
        </ul>
      )}
      <p className="admin-muted advisor-help">
        {selected.size} gagnant{selected.size > 1 ? 's' : ''}
        {challenge.prizeAmount > 0 ? ` · ${formatAmount(total)} de primes versées en rémunération` : ''}.
        La clôture est définitive.
      </p>
      {error ? <p className="field-error">{error}</p> : null}
      <div className="advisor-editor-actions">
        <button
          type="button"
          className="primary-button"
          disabled={pending}
          onClick={() =>
            run(
              `Clôturer le challenge avec ${selected.size} gagnant(s) ? Cette action est définitive.`,
              () => closeChallengeAction(challenge.id, [...selected]),
            )
          }
        >
          <Trophy size={15} /> {pending ? 'Clôture…' : 'Valider les gagnants et clôturer'}
        </button>
      </div>
    </div>
  )
}
