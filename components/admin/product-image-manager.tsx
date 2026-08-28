'use client'

import { useRef, useState, useTransition } from 'react'
import Image from 'next/image'
import { Star, Trash2, Upload } from 'lucide-react'
import type { AdminProductImage } from '@/lib/admin/products'
import {
  deleteProductImageAction,
  reorderProductImagesAction,
  uploadProductImageAction,
} from '@/app/admin-r/(dashboard)/produits/actions'

export function ProductImageManager({
  productId,
  sku,
  images,
}: {
  productId: string
  sku: string
  images: AdminProductImage[]
}) {
  // No router.refresh() in the handlers below: the server actions call
  // revalidatePath for this page, and a Server Action's response already
  // carries the refreshed RSC payload. Calling refresh() as well fired a
  // second full round-trip for every image change.
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const ordered = images.slice().sort((a, b) => a.position - b.position)

  function reorder(newOrder: string[]) {
    setError(null)
    startTransition(async () => {
      const result = await reorderProductImagesAction(productId, newOrder, sku)
      if (result.error) setError(result.error)
    })
  }

  function moveImage(index: number, direction: -1 | 1) {
    const target = index + direction
    if (target < 0 || target >= ordered.length) return
    const ids = ordered.map((img) => img.id)
    ;[ids[index], ids[target]] = [ids[target], ids[index]]
    reorder(ids)
  }

  function setHero(imageId: string) {
    const rest = ordered.filter((img) => img.id !== imageId).map((img) => img.id)
    reorder([imageId, ...rest])
  }

  function deleteImage(imageId: string) {
    setError(null)
    startTransition(async () => {
      const result = await deleteProductImageAction(imageId, sku)
      if (result.error) setError(result.error)
    })
  }

  function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    if (!file) return

    const formData = new FormData()
    formData.set('productId', productId)
    formData.set('sku', sku)
    formData.set('file', file)

    setError(null)
    startTransition(async () => {
      const result = await uploadProductImageAction(formData)
      if (result.error) setError(result.error)
      if (fileInputRef.current) fileInputRef.current.value = ''
    })
  }

  return (
    <div className="admin-image-manager">
      {ordered.length === 0 ? (
        <p className="admin-empty">Aucune image pour ce produit — le placeholder est utilisé.</p>
      ) : (
        <div className="admin-image-grid">
          {ordered.map((image, index) => (
            <div className="admin-image-tile" key={image.id}>
              {index === 0 ? <span className="admin-image-hero-tag">Photo principale</span> : null}
              <Image src={image.url} alt={image.alt ?? ''} width={140} height={140} />
              <div className="admin-image-tile-actions">
                <button
                  type="button"
                  className="icon-button"
                  aria-label="Monter"
                  disabled={pending || index === 0}
                  onClick={() => moveImage(index, -1)}
                >
                  ↑
                </button>
                <button
                  type="button"
                  className="icon-button"
                  aria-label="Descendre"
                  disabled={pending || index === ordered.length - 1}
                  onClick={() => moveImage(index, 1)}
                >
                  ↓
                </button>
                {index !== 0 ? (
                  <button
                    type="button"
                    className="icon-button"
                    aria-label="Définir comme photo principale"
                    disabled={pending}
                    onClick={() => setHero(image.id)}
                  >
                    <Star size={15} />
                  </button>
                ) : null}
                <button
                  type="button"
                  className="icon-button"
                  aria-label="Supprimer cette image"
                  disabled={pending}
                  onClick={() => deleteImage(image.id)}
                >
                  <Trash2 size={15} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {error ? <p className="field-error">{error}</p> : null}

      <label className="outline-button admin-image-upload">
        <Upload size={16} /> {pending ? 'Envoi…' : 'Ajouter une image'}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileChange}
          disabled={pending}
          hidden
        />
      </label>
    </div>
  )
}
