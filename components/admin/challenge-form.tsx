'use client'

import { useActionState, useState } from 'react'
import {
  createChallengeAction,
  updateChallengeAction,
  type ChallengeActionState,
} from '@/app/admin-r/(dashboard)/challenges/actions'
import {
  CHALLENGE_METRICS,
  CHALLENGE_METRIC_LABELS,
  type Challenge,
} from '@/lib/conseiller/format'

const MAX_SIDE = 1600

/**
 * Phone photos are several megabytes; a Server Action accepts 1 MB. The
 * picture is redrawn at 1600 px on its longest side as a JPEG, which
 * lands well under that and is plenty for a banner.
 */
async function shrinkImage(file: File): Promise<File> {
  const bitmap = await createImageBitmap(file)
  const scale = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height))
  const canvas = document.createElement('canvas')
  canvas.width = Math.round(bitmap.width * scale)
  canvas.height = Math.round(bitmap.height * scale)
  canvas.getContext('2d')!.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.85))
  if (!blob) throw new Error('Image illisible.')
  return new File([blob], 'visuel.jpg', { type: 'image/jpeg' })
}

/** Create (no challenge) or edit a challenge (H1). */
export function ChallengeForm({ challenge, today }: { challenge?: Challenge; today: string }) {
  const [image, setImage] = useState<File | null>(null)
  const [imageError, setImageError] = useState<string | null>(null)
  const [preview, setPreview] = useState<string | null>(challenge?.imageUrl ?? null)

  const [state, action, pending] = useActionState(
    async (prev: ChallengeActionState, formData: FormData) => {
      formData.delete('image')
      if (image) formData.set('image', image)
      return challenge
        ? updateChallengeAction(challenge.id, prev, formData)
        : createChallengeAction(prev, formData)
    },
    {},
  )

  async function pickImage(file: File | undefined) {
    setImageError(null)
    if (!file) return
    try {
      const small = await shrinkImage(file)
      setImage(small)
      setPreview(URL.createObjectURL(small))
    } catch {
      setImage(null)
      setImageError("Cette image n'a pas pu être lue.")
    }
  }

  return (
    <form action={action} className="advisor-stack-form">
      <div className="form-grid">
        <label className="wide">
          Titre
          <input name="title" defaultValue={challenge?.title ?? ''} required />
        </label>
        <label className="wide">
          Description (règles, conditions)
          <textarea name="description" rows={4} defaultValue={challenge?.description ?? ''} />
        </label>
        <label>
          Objectif mesuré
          <select name="metric" defaultValue={challenge?.metric ?? 'ventes'}>
            {CHALLENGE_METRICS.map((metric) => (
              <option key={metric} value={metric}>
                {CHALLENGE_METRIC_LABELS[metric]}
              </option>
            ))}
          </select>
        </label>
        <label>
          Seuil à atteindre (facultatif)
          <input
            name="target"
            inputMode="decimal"
            defaultValue={challenge?.target ?? ''}
            placeholder="Ex. 5"
          />
        </label>
        <label>
          Du
          <input type="date" name="startsOn" defaultValue={challenge?.startsOn ?? today} required />
        </label>
        <label>
          Au
          <input type="date" name="endsOn" defaultValue={challenge?.endsOn ?? ''} required />
        </label>
        <label>
          Nombre de gagnants (facultatif)
          <input
            name="winnersCount"
            inputMode="numeric"
            defaultValue={challenge?.winnersCount ?? ''}
            placeholder="Vide = tous ceux qui atteignent le seuil"
          />
        </label>
        <label>
          Prime par gagnant (TND)
          <input
            name="prizeAmount"
            inputMode="decimal"
            defaultValue={challenge ? String(challenge.prizeAmount) : '0'}
          />
        </label>
        <label className="wide">
          Récompense affichée (facultatif)
          <input
            name="rewardLabel"
            defaultValue={challenge?.rewardLabel ?? ''}
            placeholder="Ex. Un week-end à Djerba + 300 TND"
          />
        </label>
        <label className="wide">
          Visuel (facultatif)
          <input
            type="file"
            accept="image/*"
            onChange={(event) => pickImage(event.target.files?.[0])}
          />
          {imageError ? <span className="field-error">{imageError}</span> : null}
        </label>
      </div>

      {preview ? (
        // eslint-disable-next-line @next/next/no-img-element -- a local blob preview, not an optimisable asset
        <img src={preview} alt="" className="challenge-form-preview" />
      ) : null}

      <div className="admin-form-actions">
        {state.error ? (
          <p className="field-error">{state.error}</p>
        ) : state.success ? (
          <p className="admin-saved-message">Challenge enregistré.</p>
        ) : (
          <span className="admin-muted advisor-table-sub">
            La prime est versée dans la rémunération de chaque gagnant à la clôture.
          </span>
        )}
        <button type="submit" className="primary-button" disabled={pending}>
          {pending ? 'Enregistrement…' : challenge ? 'Enregistrer' : 'Créer le challenge'}
        </button>
      </div>
    </form>
  )
}
