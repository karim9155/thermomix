'use client'

import { useActionState } from 'react'
import {
  createClientAction,
  updateClientAction,
  type ClientFormState,
} from '@/app/conseiller/(espace)/clients/actions'
import { REGIONS } from '@/lib/conseiller/format'

export type ClientFormDefaults = {
  prenom: string
  nom: string
  telephone: string
  email: string
  adresse: string
  ville: string
  gouvernorat: string
  age: string
  sexe: '' | 'F' | 'H'
  notes: string
}

export const EMPTY_CLIENT: ClientFormDefaults = {
  prenom: '',
  nom: '',
  telephone: '',
  email: '',
  adresse: '',
  ville: '',
  gouvernorat: '',
  age: '',
  sexe: '',
  notes: '',
}

const initialState: ClientFormState = {}

/**
 * Create (no clientId) or edit a client record (C1, C2). Age and sex are
 * optional but asked for: they feed the network statistics.
 */
export function ClientForm({
  clientId,
  defaults,
  next,
}: {
  clientId?: string
  defaults: ClientFormDefaults
  /** 'vente' continues to a new order form for this client once created. */
  next?: 'vente'
}) {
  const [state, formAction, pending] = useActionState(
    clientId ? updateClientAction.bind(null, clientId) : createClientAction,
    initialState,
  )

  return (
    <form action={formAction} className="advisor-stack-form">
      {next ? <input type="hidden" name="next" value={next} /> : null}
      <div className="form-grid">
        <label>
          Prénom
          <input name="prenom" defaultValue={defaults.prenom} required autoFocus={!clientId} />
        </label>
        <label>
          Nom
          <input name="nom" defaultValue={defaults.nom} required />
        </label>
        <label>
          Téléphone
          <input
            type="tel"
            name="telephone"
            defaultValue={defaults.telephone}
            required
            placeholder="+216 XX XXX XXX"
          />
        </label>
        <label>
          Email (facultatif)
          <input type="email" name="email" defaultValue={defaults.email} />
        </label>
        <label className="wide">
          Adresse
          <input name="adresse" defaultValue={defaults.adresse} placeholder="Rue, numéro" />
        </label>
        <label>
          Ville
          <input name="ville" defaultValue={defaults.ville} />
        </label>
        <label>
          Gouvernorat
          <select name="gouvernorat" defaultValue={defaults.gouvernorat} required>
            <option value="" disabled>
              Choisir…
            </option>
            {REGIONS.map((region) => (
              <option key={region} value={region}>
                {region}
              </option>
            ))}
          </select>
        </label>
        <label>
          Âge
          <input name="age" inputMode="numeric" defaultValue={defaults.age} placeholder="Ex. 42" />
        </label>
        <label>
          Sexe
          <select name="sexe" defaultValue={defaults.sexe}>
            <option value="">Non renseigné</option>
            <option value="F">Femme</option>
            <option value="H">Homme</option>
          </select>
        </label>
        <label className="wide">
          Notes (facultatif)
          <textarea name="notes" rows={3} defaultValue={defaults.notes} />
        </label>
      </div>

      <div className="admin-form-actions">
        {state.error ? (
          <p className="field-error">{state.error}</p>
        ) : state.success ? (
          <p className="admin-saved-message">Fiche enregistrée.</p>
        ) : (
          <span />
        )}
        <button type="submit" className="primary-button" disabled={pending}>
          {pending ? 'Enregistrement…' : clientId ? 'Enregistrer' : 'Créer le client'}
        </button>
      </div>
    </form>
  )
}
