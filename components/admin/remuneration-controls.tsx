'use client'

import { useActionState, useState, useTransition } from 'react'
import { Calculator, Lock, Undo2, Wallet } from 'lucide-react'
import {
  addAdjustmentAction,
  cancelPayoutAction,
  closePeriodAction,
  recordPayoutAction,
  setRuleAction,
  type RemunerationActionState,
} from '@/app/admin-r/(dashboard)/remuneration/actions'
import { recalculateCommissionAction } from '@/app/admin-r/(dashboard)/bons-de-commande/actions'
import {
  PAYOUT_METHODS,
  PAYOUT_METHOD_LABELS,
  formatAmount,
  type Grade,
} from '@/lib/conseiller/format'

const initialState: RemunerationActionState = {}

function Feedback({ state, saved }: { state: RemunerationActionState; saved: string }) {
  if (state.error) return <p className="field-error">{state.error}</p>
  if (state.success) return <p className="admin-saved-message">{saved}</p>
  return null
}

/**
 * New amounts for a grade from a date (G8, F3). Past sales keep the rule
 * that was in force when they were paid, so the date can't be earlier
 * than today.
 */
export function RuleForm({
  grades,
  current,
  today,
}: {
  grades: Grade[]
  current: Record<string, { robotSaleBonus: number; recruitmentBonus: number }>
  today: string
}) {
  const [gradeId, setGradeId] = useState(grades[0]?.id ?? '')
  const [state, action, pending] = useActionState(setRuleAction, initialState)
  const values = current[gradeId]

  return (
    <form action={action} className="advisor-stack-form">
      <div className="form-grid">
        <label>
          Grade
          <select name="gradeId" value={gradeId} onChange={(event) => setGradeId(event.target.value)}>
            {grades.map((grade) => (
              <option key={grade.id} value={grade.id}>
                {grade.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          À partir du
          <input type="date" name="effectiveFrom" defaultValue={today} min={today} required />
        </label>
        {/* key: reset the defaults when another grade is picked */}
        <label key={`robot-${gradeId}`}>
          Prime par Thermomix vendu (TND)
          <input
            name="robotSaleBonus"
            inputMode="decimal"
            defaultValue={values ? String(values.robotSaleBonus) : '0'}
            required
          />
        </label>
        <label key={`recruit-${gradeId}`}>
          Bonus de recrutement (TND)
          <input
            name="recruitmentBonus"
            inputMode="decimal"
            defaultValue={values ? String(values.recruitmentBonus) : '0'}
            required
          />
        </label>
      </div>
      <div className="admin-form-actions">
        <Feedback state={state} saved="Montants enregistrés." />
        <button type="submit" className="primary-button" disabled={pending}>
          {pending ? 'Enregistrement…' : 'Enregistrer les montants'}
        </button>
      </div>
    </form>
  )
}

/** Manual bonus (positive) or deduction (negative) with a reason (G9). */
export function AdjustmentForm({ advisors }: { advisors: { id: string; name: string }[] }) {
  const [state, action, pending] = useActionState(addAdjustmentAction, initialState)

  return (
    <form action={action} className="advisor-stack-form">
      <div className="form-grid">
        <label className="wide">
          Conseiller
          <select name="advisorId" defaultValue="" required>
            <option value="" disabled>
              Choisir…
            </option>
            {advisors.map((advisor) => (
              <option key={advisor.id} value={advisor.id}>
                {advisor.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          Montant (TND, négatif pour une retenue)
          <input name="amount" inputMode="decimal" placeholder="Ex. 100 ou -50" required />
        </label>
        <label>
          Motif
          <input name="label" required minLength={3} placeholder="Ex. prime exceptionnelle" />
        </label>
      </div>
      <div className="admin-form-actions">
        <Feedback state={state} saved="Ajustement enregistré sur le mois en cours." />
        <button type="submit" className="primary-button" disabled={pending}>
          {pending ? 'Enregistrement…' : "Enregistrer l'ajustement"}
        </button>
      </div>
    </form>
  )
}

/** Closes a finished month ahead of the cron. Irreversible, so confirmed. */
export function ClosePeriodButton({ month, label }: { month: string; label: string }) {
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  function close() {
    if (
      !window.confirm(
        `Clôturer ${label} ? Le mois sera verrouillé : plus aucune ligne ne pourra y être ajoutée.`,
      )
    ) {
      return
    }
    setError(null)
    startTransition(async () => {
      const result = await closePeriodAction(month)
      if (result.error) setError(result.error)
    })
  }

  return (
    <>
      <button type="button" className="outline-button advisor-small-button" disabled={pending} onClick={close}>
        <Lock size={14} /> {pending ? 'Clôture…' : 'Clôturer'}
      </button>
      {error ? <p className="field-error">{error}</p> : null}
    </>
  )
}

/**
 * Records that an advisor's month was paid out (G13), or undoes it. The
 * amount is shown, not typed: the server pays exactly the month's net.
 */
export function PayoutControl({
  month,
  advisorId,
  total,
  paid,
  today,
}: {
  month: string
  advisorId: string
  total: number
  paid: boolean
  today: string
}) {
  const [open, setOpen] = useState(false)
  const [pending, startTransition] = useTransition()
  const [undoError, setUndoError] = useState<string | null>(null)
  const [state, action, recording] = useActionState(
    async (prev: RemunerationActionState, formData: FormData) => {
      const result = await recordPayoutAction(month, advisorId, prev, formData)
      if (result.success) setOpen(false)
      return result
    },
    initialState,
  )

  if (paid) {
    function undo() {
      if (!window.confirm('Annuler ce versement ?')) return
      setUndoError(null)
      startTransition(async () => {
        const result = await cancelPayoutAction(month, advisorId)
        if (result.error) setUndoError(result.error)
      })
    }
    return (
      <>
        <button type="button" className="outline-button advisor-small-button" disabled={pending} onClick={undo}>
          <Undo2 size={14} /> Annuler
        </button>
        {undoError ? <p className="field-error">{undoError}</p> : null}
      </>
    )
  }

  if (total <= 0) return <span className="admin-muted">—</span>

  if (!open) {
    return (
      <button type="button" className="primary-button advisor-small-button" onClick={() => setOpen(true)}>
        <Wallet size={14} /> Verser {formatAmount(total)}
      </button>
    )
  }

  return (
    <form action={action} className="advisor-payout-form">
      <input type="date" name="paidAt" defaultValue={today} max={today} required />
      <select name="method" defaultValue="virement">
        {PAYOUT_METHODS.map((method) => (
          <option key={method} value={method}>
            {PAYOUT_METHOD_LABELS[method]}
          </option>
        ))}
      </select>
      <input name="reference" placeholder="Référence (facultatif)" />
      <button type="submit" className="primary-button advisor-small-button" disabled={recording}>
        {recording ? '…' : 'Confirmer'}
      </button>
      <button type="button" className="outline-button advisor-small-button" onClick={() => setOpen(false)}>
        Annuler
      </button>
      {state.error ? <p className="field-error">{state.error}</p> : null}
    </form>
  )
}

/** Manual re-run of the commission engine for one sale. */
export function RecalculateCommissionButton({
  reference,
  orderId,
}: {
  reference: string
  orderId: string
}) {
  const [pending, startTransition] = useTransition()
  const [result, setResult] = useState<RemunerationActionState | null>(null)

  function run() {
    setResult(null)
    startTransition(async () => {
      setResult(await recalculateCommissionAction(reference, orderId))
    })
  }

  return (
    <div className="advisor-recalc">
      <button type="button" className="outline-button advisor-small-button" disabled={pending} onClick={run}>
        <Calculator size={14} /> {pending ? 'Calcul…' : 'Recalculer les primes'}
      </button>
      {result?.error ? <p className="field-error">{result.error}</p> : null}
      {result?.success ? <p className="admin-saved-message">Primes à jour.</p> : null}
    </div>
  )
}
