'use client'

import { useRef, useState, useTransition } from 'react'
import { FileText, Upload } from 'lucide-react'
import { uploadOrderInvoiceAction } from '@/app/admin-r/(dashboard)/livraisons/[reference]/actions'

export function InvoiceUploadControl({
  reference,
  hasInvoice,
  isDelivered,
}: {
  reference: string
  hasInvoice: boolean
  /** Whether delivery_status is 'livree'. The invoice can be uploaded at
      any time, but the customer only sees it once the order is delivered,
      so the control says which of the two is still missing. */
  isDelivered: boolean
}) {
  // No router.refresh() in the handler below: the action revalidates this
  // page, and a Server Action's response already carries the refreshed RSC
  // payload — calling refresh() as well fired a second round-trip.
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    if (!file) return

    const formData = new FormData()
    formData.set('file', file)

    setError(null)
    startTransition(async () => {
      const result = await uploadOrderInvoiceAction(reference, formData)
      if (result.error) setError(result.error)
      if (fileInputRef.current) fileInputRef.current.value = ''
    })
  }

  return (
    <div className="admin-invoice-control">
      {hasInvoice ? (
        <a
          className="outline-button full center"
          href={`/admin-r/livraisons/${reference}/facture`}
          target="_blank"
          rel="noreferrer"
        >
          <FileText size={16} /> Voir la facture
        </a>
      ) : (
        <p className="admin-empty">Aucune facture uploadée.</p>
      )}

      {/* The upload is unrestricted; visibility is not. Say plainly what
          the customer can see right now, so uploading early does not look
          like it silently failed. */}
      <p className="admin-invoice-visibility">
        {!hasInvoice
          ? "Vous pouvez l'uploader dès maintenant : le client la verra une fois la commande livrée."
          : isDelivered
            ? 'Visible par le client.'
            : "Enregistrée. Elle sera visible par le client une fois la commande livrée."}
      </p>

      {error ? <p className="field-error">{error}</p> : null}

      <label className="outline-button full center admin-invoice-upload">
        <Upload size={16} /> {pending ? 'Envoi…' : hasInvoice ? 'Remplacer la facture' : 'Uploader la facture (PDF)'}
        <input
          ref={fileInputRef}
          type="file"
          accept="application/pdf"
          onChange={handleFileChange}
          disabled={pending}
          hidden
        />
      </label>
    </div>
  )
}
