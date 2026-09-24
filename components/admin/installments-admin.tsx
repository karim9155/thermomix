'use client'

import { useActionState, useState, useTransition } from 'react'
import { CalendarClock, Undo2, Wallet } from 'lucide-react'
import {
  recordPaymentAction,
  reviseScheduleAction,
  undoPaymentAction,
  type SaleActionState,
} from '@/app/admin-r/(dashboard)/bons-de-commande/actions'
import { formatPriceHT } from '@/lib/product-format'
import {
  INSTALLMENT_PAYMENT_LABELS,
  INSTALLMENT_PAYMENT_METHODS,
  type Installment,
} from '@/lib/conseiller/format'
import { InstallmentStatus, formatDay } from '@/components/conseiller/sale-summary'

/**
 * The schedule with the admin's controls: record a payment (D11), undo
 * one recorded by mistake, and revise the unpaid instalments (D14).
 * `canCollect` is false for a cancelled sale.
 */
export function InstallmentsAdmin({
  reference,
  installments,
  canCollect,
  canRevise,
  today,
}: {
  reference: string
  installments: Installment[]
  canCollect: boolean
  canRevise: boolean
  today: string
}) {
  const [collecting, setCollecting] = useState<string | null>(null)
  const [revising, setRevising] = useState(false)

  if (revising) {
    return (
      <ReviseSchedule
        reference={reference}
        installments={installments}
        onDone={() => setRevising(false)}
      />
    )
  }

  return (
    <>
      <div className="admin-table-scroll">
        <table className="admin-table">
          <thead>
            <tr>
              <th>Tranche</th>
              <th>Échéance</th>
              <th>Montant</th>
              <th>Statut</th>
              {canCollect ? <th>Actions</th> : null}
            </tr>
          </thead>
          <tbody>
            {installments.map((entry) => (
              <tr key={entry.id}>
                <td>{entry.number}</td>
                <td>{formatDay(entry.dueDate)}</td>
                <td>{formatPriceHT(entry.amount)}</td>
                <td>
                  <InstallmentStatus entry={entry} />
                  {entry.paymentNote ? <div className="admin-muted advisor-table-sub">{entry.paymentNote}</div> : null}
                </td>
                {canCollect ? (
                  <td>
                    {entry.paidAt ? (
                      <UndoPayment reference={reference} installmentId={entry.id} />
                    ) : collecting === entry.id ? null : (
                      <button
                        type="button"
                        className="outline-button advisor-small-button"
                        onClick={() => setCollecting(entry.id)}
                      >
                        <Wallet size={14} /> Encaisser
                      </button>
                    )}
                  </td>
                ) : null}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {collecting ? (
        <RecordPayment
          key={collecting}
          reference={reference}
          installment={installments.find((entry) => entry.id === collecting)!}
          today={today}
          onDone={() => setCollecting(null)}
        />
      ) : null}

      {canRevise && installments.some((entry) => !entry.paidAt) ? (
        <button
          type="button"
          className="outline-button advisor-inline-link"
          onClick={() => setRevising(true)}
        >
          <CalendarClock size={15} /> Reporter / réviser l&apos;échéancier
        </button>
      ) : null}
    </>
  )
}

function RecordPayment({
  reference,
  installment,
  today,
  onDone,
}: {
  reference: string
  installment: Installment
  today: string
  onDone: () => void
}) {
  const [state, action, pending] = useActionState(
    async (prev: SaleActionState, formData: FormData) => {
      const result = await recordPaymentAction(reference, installment.id, prev, formData)
      if (result.success) onDone()
      return result
    },
    {},
  )

  return (
    <form action={action} className="admin-card advisor-payment-form">
      <h3 className="advisor-subheading advisor-subheading-flush">
        Encaisser la tranche {installment.number} — {formatPriceHT(installment.amount)}
      </h3>
      <div className="form-grid">
        <label>
          Date d&apos;encaissement
          <input type="date" name="paidAt" defaultValue={today} max={today} required />
        </label>
        <label>
          Mode de paiement
          <select name="method" defaultValue="especes" required>
            {INSTALLMENT_PAYMENT_METHODS.map((method) => (
              <option key={method} value={method}>
                {INSTALLMENT_PAYMENT_LABELS[method]}
              </option>
            ))}
          </select>
        </label>
        <label className="wide">
          Note (facultatif)
          <input name="note" placeholder="Ex. n° de chèque" />
        </label>
      </div>
      {state.error ? <p className="field-error">{state.error}</p> : null}
      <div className="advisor-editor-actions">
        <button type="submit" className="primary-button" disabled={pending}>
          {pending ? 'Enregistrement…' : "Enregistrer l'encaissement"}
        </button>
        <button type="button" className="outline-button" disabled={pending} onClick={onDone}>
          Annuler
        </button>
      </div>
    </form>
  )
}

function UndoPayment({ reference, installmentId }: { reference: string; installmentId: string }) {
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  function undo() {
    if (!window.confirm('Annuler cet encaissement ? La tranche redeviendra due.')) return
    setError(null)
    startTransition(async () => {
      const result = await undoPaymentAction(reference, installmentId)
      if (result.error) setError(result.error)
    })
  }

  return (
    <>
      <button type="button" className="outline-button advisor-small-button" disabled={pending} onClick={undo}>
        <Undo2 size={14} /> {pending ? '…' : 'Annuler'}
      </button>
      {error ? <p className="field-error">{error}</p> : null}
    </>
  )
}

/**
 * Edits due dates and amounts of the unpaid instalments. The server
 * refuses a schedule that no longer adds up to the amount due; the
 * running total here shows the gap before submitting.
 */
function ReviseSchedule({
  reference,
  installments,
  onDone,
}: {
  reference: string
  installments: Installment[]
  onDone: () => void
}) {
  const [rows, setRows] = useState(
    installments
      .filter((entry) => !entry.paidAt)
      .map((entry) => ({ id: entry.id, number: entry.number, dueDate: entry.dueDate, amount: String(entry.amount) })),
  )
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  const originalUnpaid = installments
    .filter((entry) => !entry.paidAt)
    .reduce((sum, entry) => sum + entry.amount, 0)
  const newUnpaid = rows.reduce((sum, row) => sum + (Number(row.amount.replace(',', '.')) || 0), 0)
  const gap = Math.round((originalUnpaid - newUnpaid) * 1000) / 1000

  function update(id: string, field: 'dueDate' | 'amount', value: string) {
    setRows((current) => current.map((row) => (row.id === id ? { ...row, [field]: value } : row)))
  }

  function save() {
    setError(null)
    startTransition(async () => {
      const result = await reviseScheduleAction(
        reference,
        rows.map((row) => ({
          id: row.id,
          dueDate: row.dueDate,
          amount: Number(row.amount.replace(',', '.')),
        })),
      )
      if (result.error) setError(result.error)
      else onDone()
    })
  }

  return (
    <div className="advisor-stack-form">
      <div className="admin-table-scroll">
        <table className="admin-table">
          <thead>
            <tr>
              <th>Tranche</th>
              <th>Échéance</th>
              <th>Montant (TND)</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id}>
                <td>{row.number}</td>
                <td>
                  <input
                    type="date"
                    className="advisor-cell-input"
                    value={row.dueDate}
                    onChange={(event) => update(row.id, 'dueDate', event.target.value)}
                  />
                </td>
                <td>
                  <input
                    inputMode="decimal"
                    className="advisor-cell-input"
                    value={row.amount}
                    onChange={(event) => update(row.id, 'amount', event.target.value)}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className={gap === 0 ? 'admin-muted advisor-help' : 'field-error'}>
        {gap === 0
          ? 'Le total des tranches restantes est inchangé.'
          : `Écart de ${gap.toFixed(3)} TND avec le reste à payer : ajustez les montants.`}
      </p>
      {error ? <p className="field-error">{error}</p> : null}
      <div className="advisor-editor-actions">
        <button type="button" className="primary-button" disabled={pending || gap !== 0} onClick={save}>
          {pending ? 'Enregistrement…' : "Enregistrer l'échéancier"}
        </button>
        <button type="button" className="outline-button" disabled={pending} onClick={onDone}>
          Annuler
        </button>
      </div>
    </div>
  )
}
