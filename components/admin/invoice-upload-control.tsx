'use client'

import { useRef, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { FileText, Upload } from 'lucide-react'
import { uploadOrderInvoiceAction } from '@/app/admin-r/(dashboard)/livraisons/[reference]/actions'

export function InvoiceUploadControl({
  reference,
  hasInvoice,
}: {
  reference: string
  hasInvoice: boolean
}) {
  const router = useRouter()
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
      router.refresh()
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
