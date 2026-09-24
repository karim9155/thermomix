'use client'

import { useActionState, useState, useTransition } from 'react'
import { Ban, ClipboardCheck } from 'lucide-react'
import {
  cancelWorkshopAction,
  createWorkshopAction,
  saveReportAction,
  updateWorkshopAction,
  type WorkshopActionState,
} from '@/app/conseiller/(espace)/ateliers/actions'
import { REGIONS, isoToTunisLocal, type Workshop } from '@/lib/conseiller/format'

const initialState: WorkshopActionState = {}

/** Plan (no workshop) or edit a planned workshop (E1, E2). */
export function WorkshopForm({
  workshop,
  hosts,
  defaultRegion,
}: {
  workshop?: Workshop
  hosts: { id: string; name: string }[]
  defaultRegion: string
}) {
  const [state, action, pending] = useActionState(
    workshop ? updateWorkshopAction.bind(null, workshop.id) : createWorkshopAction,
    initialState,
  )

  return (
    <form action={action} className="advisor-stack-form">
      <div className="form-grid">
        <label>
          Date et heure
          <input
            type="datetime-local"
            name="scheduledAt"
            defaultValue={workshop ? isoToTunisLocal(workshop.scheduledAt) : ''}
            required
          />
        </label>
        <label>
          Nombre d&apos;invités
          <input
            name="invitedCount"
            inputMode="numeric"
            defaultValue={workshop ? String(workshop.invitedCount) : ''}
            placeholder="Ex. 8"
          />
        </label>
        <label className="wide">
          Client hôte (facultatif)
          <select name="hostClientId" defaultValue={workshop?.hostClientId ?? ''}>
            <option value="">Aucun / pas encore enregistré</option>
            {hosts.map((host) => (
              <option key={host.id} value={host.id}>
                {host.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          Lieu
          <input
            name="location"
            defaultValue={workshop?.location ?? ''}
            placeholder="Adresse, ville"
            required
          />
        </label>
        <label>
          Gouvernorat
          <select name="gouvernorat" defaultValue={workshop?.gouvernorat ?? defaultRegion} required>
            {REGIONS.map((region) => (
              <option key={region} value={region}>
                {region}
              </option>
            ))}
          </select>
        </label>
        <label className="wide">
          Notes (facultatif)
          <textarea name="notes" rows={3} defaultValue={workshop?.notes ?? ''} />
        </label>
      </div>
      <div className="admin-form-actions">
        {state.error ? (
          <p className="field-error">{state.error}</p>
        ) : state.success ? (
          <p className="admin-saved-message">Atelier enregistré.</p>
        ) : (
          <span />
        )}
        <button type="submit" className="primary-button" disabled={pending}>
          {pending ? 'Enregistrement…' : workshop ? 'Enregistrer' : "Planifier l'atelier"}
        </button>
      </div>
    </form>
  )
}

/** The report (E4). Saving it marks a planned workshop as done (E3). */
export function WorkshopReportForm({ workshop }: { workshop: Workshop }) {
  const [state, action, pending] = useActionState(
    saveReportAction.bind(null, workshop.id),
    initialState,
  )
  const done = workshop.status === 'effectue'

  return (
    <form action={action} className="advisor-stack-form">
      <div className="form-grid">
        <label>
          Présents
          <input
            name="attendeesCount"
            inputMode="numeric"
            defaultValue={workshop.attendeesCount ?? ''}
            required
          />
        </label>
        <label>
          Contacts obtenus
          <input name="contactsCount" inputMode="numeric" defaultValue={workshop.contactsCount ?? ''} />
        </label>
        <label className="wide">
          Retours des participants
          <textarea name="feedback" rows={3} defaultValue={workshop.feedback ?? ''} />
        </label>
        <label className="wide">
          Observations
          <textarea name="observations" rows={3} defaultValue={workshop.observations ?? ''} />
        </label>
      </div>
      <div className="admin-form-actions">
        {state.error ? (
          <p className="field-error">{state.error}</p>
        ) : state.success ? (
          <p className="admin-saved-message">Rapport enregistré.</p>
        ) : (
          <span />
        )}
        <button type="submit" className="primary-button" disabled={pending}>
          <ClipboardCheck size={15} />{' '}
          {pending ? 'Enregistrement…' : done ? 'Mettre à jour le rapport' : 'Marquer effectué et enregistrer'}
        </button>
      </div>
    </form>
  )
}

export function CancelWorkshopButton({ workshopId }: { workshopId: string }) {
  const [open, setOpen] = useState(false)
  const [reason, setReason] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  if (!open) {
    return (
      <button type="button" className="outline-button advisor-suspend-button" onClick={() => setOpen(true)}>
        <Ban size={15} /> Annuler l&apos;atelier
      </button>
    )
  }

  return (
    <div className="admin-status-confirm advisor-cancel-form">
      <p>Annuler cet atelier ?</p>
      <input
        value={reason}
        onChange={(event) => setReason(event.target.value)}
        placeholder="Motif de l'annulation"
        autoFocus
      />
      {error ? <p className="field-error">{error}</p> : null}
      <div className="hero-actions">
        <button
          type="button"
          className="primary-button admin-danger-button"
          disabled={pending}
          onClick={() =>
            startTransition(async () => {
              setError(null)
              const result = await cancelWorkshopAction(workshopId, reason)
              if (result.error) setError(result.error)
            })
          }
        >
          {pending ? 'Annulation…' : "Confirmer l'annulation"}
        </button>
        <button type="button" className="outline-button" disabled={pending} onClick={() => setOpen(false)}>
          Retour
        </button>
      </div>
    </div>
  )
}
