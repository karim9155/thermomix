'use client'

import { useActionState, useState, useTransition } from 'react'
import { Archive, ArchiveRestore, ArrowUpCircle } from 'lucide-react'
import {
  createGradeAction,
  promoteAction,
  setGradeArchivedAction,
  updateGradeAction,
  type GradeActionState,
} from '@/app/admin-r/(dashboard)/conseillers/grades/actions'
import type { GradeDetail } from '@/lib/conseiller/format'

const initialState: GradeActionState = {}

/**
 * Create (no grade) or edit a grade: name, rank and the criteria to reach
 * it (F1, F2). On creation it also takes the grade's amounts (F3); after
 * that, amounts are changed in Rémunération, where they carry a date.
 */
export function GradeForm({ grade, nextRank }: { grade?: GradeDetail; nextRank?: number }) {
  const [state, action, pending] = useActionState(
    grade ? updateGradeAction.bind(null, grade.id) : createGradeAction,
    initialState,
  )

  return (
    <form action={action} className="advisor-stack-form">
      <div className="form-grid">
        <label>
          Nom
          <input name="name" defaultValue={grade?.name ?? ''} required />
        </label>
        <label>
          Rang (1 = grade de départ)
          <input
            name="rank"
            inputMode="numeric"
            defaultValue={grade?.rank ?? nextRank ?? ''}
            required
          />
        </label>
        <label className="wide">
          Description (facultatif)
          <input name="description" defaultValue={grade?.description ?? ''} />
        </label>
        <label>
          Chiffre d&apos;affaires minimum (TND TTC)
          <input
            name="minRevenue"
            inputMode="decimal"
            defaultValue={grade ? String(grade.criteria.minRevenue) : '0'}
          />
        </label>
        <label>
          Ventes minimum
          <input
            name="minSales"
            inputMode="numeric"
            defaultValue={grade ? String(grade.criteria.minSales) : '0'}
          />
        </label>
        <label>
          Recrues activées minimum
          <input
            name="minRecruits"
            inputMode="numeric"
            defaultValue={grade ? String(grade.criteria.minRecruits) : '0'}
          />
        </label>
        <label>
          Sur les derniers (mois)
          <input
            name="periodMonths"
            inputMode="numeric"
            defaultValue={grade ? String(grade.criteria.periodMonths) : '3'}
            required
          />
        </label>
        {grade ? null : (
          <>
            <label>
              Prime par Thermomix (TND)
              <input name="robotSaleBonus" inputMode="decimal" defaultValue="450" required />
            </label>
            <label>
              Bonus de recrutement (TND)
              <input name="recruitmentBonus" inputMode="decimal" defaultValue="0" required />
            </label>
          </>
        )}
      </div>
      <div className="admin-form-actions">
        {state.error ? (
          <p className="field-error">{state.error}</p>
        ) : state.success ? (
          <p className="admin-saved-message">{grade ? 'Grade enregistré.' : 'Grade créé.'}</p>
        ) : (
          <span className="admin-muted advisor-table-sub">0 = pas d&apos;exigence sur ce critère.</span>
        )}
        <button type="submit" className="primary-button" disabled={pending}>
          {pending ? 'Enregistrement…' : grade ? 'Enregistrer' : 'Créer le grade'}
        </button>
      </div>
    </form>
  )
}

export function GradeArchiveButton({ gradeId, archived }: { gradeId: string; archived: boolean }) {
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  function toggle() {
    const question = archived
      ? 'Restaurer ce grade ?'
      : "Archiver ce grade ? Il ne pourra plus être attribué ; les conseillers qui l'ont le gardent."
    if (!window.confirm(question)) return
    setError(null)
    startTransition(async () => {
      const result = await setGradeArchivedAction(gradeId, !archived)
      if (result.error) setError(result.error)
    })
  }

  return (
    <>
      <button type="button" className="outline-button advisor-small-button" disabled={pending} onClick={toggle}>
        {archived ? <ArchiveRestore size={14} /> : <Archive size={14} />}
        {archived ? 'Restaurer' : 'Archiver'}
      </button>
      {error ? <p className="field-error">{error}</p> : null}
    </>
  )
}

/** Validates a proposed promotion (F5). */
export function PromoteButton({
  advisorId,
  gradeId,
  gradeName,
  reason,
}: {
  advisorId: string
  gradeId: string
  gradeName: string
  reason: string
}) {
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  function promote() {
    if (!window.confirm(`Promouvoir au grade ${gradeName} ?`)) return
    setError(null)
    startTransition(async () => {
      const result = await promoteAction(advisorId, gradeId, reason)
      if (result?.error) setError(result.error)
    })
  }

  return (
    <>
      <button type="button" className="primary-button advisor-small-button" disabled={pending} onClick={promote}>
        <ArrowUpCircle size={14} /> {pending ? 'Promotion…' : `Promouvoir ${gradeName}`}
      </button>
      {error ? <p className="field-error">{error}</p> : null}
    </>
  )
}
