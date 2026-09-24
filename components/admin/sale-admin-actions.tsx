'use client'

import { useActionState, useState } from 'react'
import { Ban, FileCheck2, Undo2 } from 'lucide-react'
import {
  cancelSaleAction,
  invoiceSaleAction,
  refuseSaleAction,
  type SaleActionState,
} from '@/app/admin-r/(dashboard)/bons-de-commande/actions'
import { formatPrice } from '@/lib/product-format'
import type { SaleStatus } from '@/lib/conseiller/format'

const initialState: SaleActionState = {}

/**
 * Validation of a submitted order form (D9, D10): issue the invoice —
 * choosing, for this sale only, whether the delivery fee and the fiscal
 * stamp apply — or send it back to the advisor with a reason.
 */
export function InvoiceDecision({
  reference,
  totalTTC,
  deliveryFeePreview,
  timbrePreview,
  installmentLabel,
}: {
  reference: string
  totalTTC: number
  /** What the delivery fee would be; 0 for store pickup. */
  deliveryFeePreview: number
  timbrePreview: number
  installmentLabel: string
}) {
  const [mode, setMode] = useState<'invoice' | 'refuse'>('invoice')
  const [applyDelivery, setApplyDelivery] = useState(deliveryFeePreview > 0)
  const [applyTimbre, setApplyTimbre] = useState(true)
  const [invoiceState, invoiceAction, invoicing] = useActionState(
    invoiceSaleAction.bind(null, reference),
    initialState,
  )
  const [refuseState, refuseAction, refusing] = useActionState(
    refuseSaleAction.bind(null, reference),
    initialState,
  )

  const total =
    totalTTC + (applyDelivery ? deliveryFeePreview : 0) + (applyTimbre ? timbrePreview : 0)

  if (mode === 'refuse') {
    return (
      <form action={refuseAction} className="advisor-stack-form">
        <label className="advisor-block-label">
          Motif du refus (visible par le conseiller)
          <textarea name="reason" rows={3} required minLength={3} autoFocus />
        </label>
        {refuseState.error ? <p className="field-error">{refuseState.error}</p> : null}
        <div className="advisor-editor-actions">
          <button type="submit" className="primary-button admin-danger-button" disabled={refusing}>
            <Undo2 size={15} /> {refusing ? 'Refus…' : 'Renvoyer au conseiller'}
          </button>
          <button type="button" className="outline-button" onClick={() => setMode('invoice')}>
            Annuler
          </button>
        </div>
      </form>
    )
  }

  return (
    <form action={invoiceAction} className="advisor-stack-form">
      <label className="admin-checkbox">
        <input
          type="checkbox"
          name="applyDeliveryFee"
          checked={applyDelivery}
          disabled={deliveryFeePreview === 0}
          onChange={(event) => setApplyDelivery(event.target.checked)}
        />
        Frais de livraison ({formatPrice(deliveryFeePreview)})
      </label>
      <label className="admin-checkbox">
        <input
          type="checkbox"
          name="applyTimbre"
          checked={applyTimbre}
          onChange={(event) => setApplyTimbre(event.target.checked)}
        />
        Timbre fiscal ({formatPrice(timbrePreview)})
      </label>

      <div className="admin-totals advisor-totals-flush">
        <div className="admin-totals-final">
          <span>Total facturé</span>
          <strong>{formatPrice(total)}</strong>
        </div>
        <div>
          <span>Paiement</span>
          <strong>{installmentLabel}</strong>
        </div>
      </div>

      {invoiceState.error ? <p className="field-error">{invoiceState.error}</p> : null}

      <div className="advisor-editor-actions">
        <button type="submit" className="primary-button" disabled={invoicing}>
          <FileCheck2 size={15} /> {invoicing ? 'Facturation…' : 'Valider et facturer'}
        </button>
        <button type="button" className="outline-button" onClick={() => setMode('refuse')}>
          Refuser
        </button>
      </div>
    </form>
  )
}

/** Cancellation at any stage after submission (D16), with a reason. */
export function CancelSale({ reference, status }: { reference: string; status: SaleStatus }) {
  const [open, setOpen] = useState(false)
  const [state, action, pending] = useActionState(cancelSaleAction.bind(null, reference), initialState)

  if (!open) {
    return (
      <button type="button" className="outline-button advisor-suspend-button" onClick={() => setOpen(true)}>
        <Ban size={15} /> Annuler la vente
      </button>
    )
  }

  return (
    <form action={action} className="admin-status-confirm advisor-cancel-form">
      <p>
        Annuler cette vente ?
        {status === 'paye' || status === 'partiellement_paye'
          ? ' Des encaissements sont déjà enregistrés : le remboursement se gère hors de cet écran.'
          : ''}
      </p>
      <input name="reason" required minLength={3} placeholder="Motif de l'annulation" autoFocus />
      {state.error ? <p className="field-error">{state.error}</p> : null}
      <div className="hero-actions">
        <button type="submit" className="primary-button admin-danger-button" disabled={pending}>
          {pending ? 'Annulation…' : "Confirmer l'annulation"}
        </button>
        <button type="button" className="outline-button" disabled={pending} onClick={() => setOpen(false)}>
          Retour
        </button>
      </div>
    </form>
  )
}
