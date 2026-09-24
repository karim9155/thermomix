'use client'

import { useMemo, useState, useTransition } from 'react'
import Link from 'next/link'
import { Minus, Plus, Save, Send, Trash2, UserPlus } from 'lucide-react'
import { saveOrderFormAction, deleteDraftAction } from '@/app/conseiller/(espace)/ventes/actions'
import { formatPrice } from '@/lib/product-format'
import { installmentCountLabel, type OrderFormValues } from '@/lib/conseiller/format'

export type EditorProduct = {
  sku: string
  name: string
  priceTTC: number
  stockQuantity: number
}

export type EditorClient = {
  id: string
  name: string
  hasAddress: boolean
}

/**
 * Order-form editor (D1, D3–D6). Prices shown here are a preview only:
 * the browser sends SKUs and quantities, and the server re-prices from
 * the catalog on every save (D2). Delivery fee and fiscal stamp are
 * decided by the admin at invoicing, so they are not in this total.
 */
export function OrderFormEditor({
  reference,
  products,
  clients,
  initial,
}: {
  reference: string | null
  products: EditorProduct[]
  clients: EditorClient[]
  initial: OrderFormValues
}) {
  const [clientId, setClientId] = useState(initial.clientId)
  const [lines, setLines] = useState(initial.items)
  const [deliveryMethod, setDeliveryMethod] = useState(initial.deliveryMethod)
  const [installmentCount, setInstallmentCount] = useState(initial.installmentCount)
  const [notes, setNotes] = useState(initial.notes ?? '')
  const [toAdd, setToAdd] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [confirmSubmit, setConfirmSubmit] = useState(false)
  const [pending, startTransition] = useTransition()

  const productBySku = useMemo(() => new Map(products.map((p) => [p.sku, p])), [products])
  const client = clients.find((c) => c.id === clientId)

  const total = lines.reduce(
    (sum, line) => sum + (productBySku.get(line.sku)?.priceTTC ?? 0) * line.quantity,
    0,
  )

  function addProduct() {
    if (!toAdd) return
    setLines((current) =>
      current.some((line) => line.sku === toAdd)
        ? current.map((line) => (line.sku === toAdd ? { ...line, quantity: line.quantity + 1 } : line))
        : [...current, { sku: toAdd, quantity: 1 }],
    )
    setToAdd('')
  }

  function setQuantity(sku: string, quantity: number) {
    setLines((current) =>
      quantity <= 0
        ? current.filter((line) => line.sku !== sku)
        : current.map((line) => (line.sku === sku ? { ...line, quantity: Math.min(99, quantity) } : line)),
    )
  }

  function save(submit: boolean) {
    setError(null)
    setConfirmSubmit(false)
    startTransition(async () => {
      // On success the action redirects, so a result only ever means an error.
      const result = await saveOrderFormAction(
        reference,
        { clientId, items: lines, deliveryMethod, installmentCount, notes },
        submit,
      )
      if (result?.error) setError(result.error)
    })
  }

  function remove() {
    if (!reference || !window.confirm('Supprimer définitivement ce brouillon ?')) return
    setError(null)
    startTransition(async () => {
      const result = await deleteDraftAction(reference)
      if (result?.error) setError(result.error)
    })
  }

  return (
    <div className="admin-detail-grid">
      <div className="admin-detail-main">
        <section className="admin-card">
          <h2>Client</h2>
          <div className="form-grid">
            <label className="wide">
              Client
              <select value={clientId} onChange={(event) => setClientId(event.target.value)}>
                <option value="">Choisir un client…</option>
                {clients.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <Link href="/conseiller/clients/nouveau?next=vente" className="outline-button advisor-inline-link">
            <UserPlus size={15} /> Nouveau client
          </Link>
        </section>

        <section className="admin-card">
          <h2>Produits</h2>
          <div className="advisor-inline-form advisor-add-product">
            <select value={toAdd} onChange={(event) => setToAdd(event.target.value)}>
              <option value="">Ajouter un produit…</option>
              {products.map((product) => (
                <option key={product.sku} value={product.sku}>
                  {product.name} — {formatPrice(product.priceTTC)}
                  {product.stockQuantity === 0 ? ' (rupture)' : ''}
                </option>
              ))}
            </select>
            <button type="button" className="outline-button" onClick={addProduct} disabled={!toAdd}>
              <Plus size={15} /> Ajouter
            </button>
          </div>

          {lines.length === 0 ? (
            <p className="admin-empty">Aucun produit pour le moment.</p>
          ) : (
            <ul className="advisor-lines">
              {lines.map((line) => {
                const product = productBySku.get(line.sku)
                return (
                  <li key={line.sku}>
                    <div>
                      <strong>{product?.name ?? `Réf. ${line.sku} (indisponible)`}</strong>
                      <span className="admin-muted">
                        {product ? formatPrice(product.priceTTC) : '—'}
                        {product && line.quantity > product.stockQuantity
                          ? ` · stock : ${product.stockQuantity}`
                          : ''}
                      </span>
                    </div>
                    <div className="advisor-qty">
                      <button
                        type="button"
                        aria-label="Diminuer"
                        onClick={() => setQuantity(line.sku, line.quantity - 1)}
                      >
                        <Minus size={14} />
                      </button>
                      <span>{line.quantity}</span>
                      <button
                        type="button"
                        aria-label="Augmenter"
                        onClick={() => setQuantity(line.sku, line.quantity + 1)}
                      >
                        <Plus size={14} />
                      </button>
                    </div>
                    <strong>{product ? formatPrice(product.priceTTC * line.quantity) : '—'}</strong>
                  </li>
                )
              })}
            </ul>
          )}
        </section>

        <section className="admin-card">
          <h2>Livraison et paiement</h2>
          <div className="form-grid">
            <label>
              Mode de livraison
              <select
                value={deliveryMethod}
                onChange={(event) => setDeliveryMethod(event.target.value as 'domicile' | 'boutique')}
              >
                <option value="domicile">Livraison à domicile</option>
                <option value="boutique">Retrait en boutique</option>
              </select>
            </label>
            <label>
              Paiement
              <select
                value={installmentCount}
                onChange={(event) => setInstallmentCount(Number(event.target.value))}
              >
                {[1, 2, 3, 4, 5].map((count) => (
                  <option key={count} value={count}>
                    {installmentCountLabel(count)}
                  </option>
                ))}
              </select>
            </label>
            <label className="wide">
              Notes pour l&apos;administration (facultatif)
              <textarea rows={3} value={notes} onChange={(event) => setNotes(event.target.value)} />
            </label>
          </div>
          {deliveryMethod === 'domicile' && client && !client.hasAddress ? (
            <p className="field-error advisor-field-note">
              Ce client n&apos;a pas d&apos;adresse complète : complétez sa fiche avant de soumettre.
            </p>
          ) : null}
        </section>
      </div>

      <aside className="admin-detail-side">
        <section className="admin-card">
          <h2>Récapitulatif</h2>
          <div className="admin-totals advisor-totals-flush">
            <div>
              <span>Total produits TTC</span>
              <strong>{formatPrice(total)}</strong>
            </div>
            {installmentCount > 1 && total > 0 ? (
              <div>
                <span>{installmentCountLabel(installmentCount)}</span>
                <strong>≈ {formatPrice(total / installmentCount)} / mois</strong>
              </div>
            ) : null}
          </div>
          <p className="admin-muted advisor-help">
            Frais de livraison et timbre fiscal éventuels sont ajoutés par l&apos;administration à la
            facturation. Les prix sont recalculés depuis le catalogue à chaque enregistrement.
          </p>

          {error ? <p className="field-error">{error}</p> : null}

          {confirmSubmit ? (
            <div className="advisor-confirm">
              <p>Une fois soumis, le bon ne peut plus être modifié. Continuer ?</p>
              <div className="hero-actions">
                <button type="button" className="primary-button" disabled={pending} onClick={() => save(true)}>
                  {pending ? 'Envoi…' : 'Oui, soumettre'}
                </button>
                <button
                  type="button"
                  className="outline-button"
                  disabled={pending}
                  onClick={() => setConfirmSubmit(false)}
                >
                  Annuler
                </button>
              </div>
            </div>
          ) : (
            <div className="advisor-editor-actions">
              <button
                type="button"
                className="outline-button"
                disabled={pending || !clientId || lines.length === 0}
                onClick={() => save(false)}
              >
                <Save size={15} /> {pending ? 'Enregistrement…' : 'Enregistrer le brouillon'}
              </button>
              <button
                type="button"
                className="primary-button"
                disabled={pending || !clientId || lines.length === 0}
                onClick={() => setConfirmSubmit(true)}
              >
                <Send size={15} /> Soumettre
              </button>
              {reference ? (
                <button
                  type="button"
                  className="outline-button advisor-suspend-button"
                  disabled={pending}
                  onClick={remove}
                >
                  <Trash2 size={15} /> Supprimer le brouillon
                </button>
              ) : null}
            </div>
          )}
        </section>
      </aside>
    </div>
  )
}
