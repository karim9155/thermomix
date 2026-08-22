'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Dialog } from '@base-ui/react/dialog'
import { AlertTriangle, Trash2, X } from 'lucide-react'
import { hardDeleteProductAction } from '@/app/admin-r/(dashboard)/produits/actions'

export function HardDeleteDialog({ sku, slug }: { sku: string; slug: string }) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [confirmText, setConfirmText] = useState('')
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleDelete() {
    setPending(true)
    setError(null)
    const result = await hardDeleteProductAction(sku, slug)
    if (result.error) {
      setError(result.error)
      setPending(false)
      return
    }
    router.push('/admin-r/produits')
  }

  return (
    <Dialog.Root
      open={open}
      onOpenChange={(next) => {
        setOpen(next)
        if (!next) {
          setConfirmText('')
          setError(null)
        }
      }}
    >
      <Dialog.Trigger className="outline-button admin-danger-button">
        <Trash2 size={16} /> Supprimer définitivement
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Backdrop className="cart-drawer-backdrop" />
        <Dialog.Popup className="admin-dialog">
          <div className="admin-dialog-header">
            <AlertTriangle size={20} className="admin-danger-icon" />
            <Dialog.Title>Supprimer {sku} définitivement ?</Dialog.Title>
            <Dialog.Close className="icon-button" aria-label="Fermer">
              <X size={18} />
            </Dialog.Close>
          </div>
          <Dialog.Description>
            Cette action supprime le produit et toutes ses images du stockage. Elle est
            irréversible. Les commandes déjà passées conservent leur propre copie des articles
            et ne sont pas affectées.
          </Dialog.Description>

          <label className="admin-confirm-input">
            Tapez <strong>{sku}</strong> pour confirmer
            <input value={confirmText} onChange={(event) => setConfirmText(event.target.value)} />
          </label>

          {error ? <p className="field-error">{error}</p> : null}

          <div className="hero-actions">
            <button
              type="button"
              className="admin-danger-button primary-button"
              disabled={confirmText !== sku || pending}
              onClick={handleDelete}
            >
              {pending ? 'Suppression…' : 'Supprimer définitivement'}
            </button>
            <Dialog.Close className="outline-button">Annuler</Dialog.Close>
          </div>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
