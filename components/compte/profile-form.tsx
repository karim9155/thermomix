'use client'

import { useActionState } from 'react'
import { Check } from 'lucide-react'
import { updateProfile, type ProfileState } from '@/app/compte/actions'
import type { Profile } from '@/lib/compte/profile'
import { governorates } from '@/lib/product-format'

const initialState: ProfileState = {}

export function ProfileForm({ profile, email }: { profile: Profile; email: string }) {
  const [state, formAction, pending] = useActionState(updateProfile, initialState)

  return (
    <form className="compte-profile-form" action={formAction}>
      <div className="compte-profile-row">
        <label>
          Prénom
          <input name="prenom" defaultValue={profile.prenom} required maxLength={80} />
        </label>
        <label>
          Nom
          <input name="nom" defaultValue={profile.nom} required maxLength={80} />
        </label>
      </div>

      <label>
        Email
        {/* Changing the sign-in address is a different operation with its
            own confirmation flow, so it is shown here but not editable. */}
        <input value={email} disabled readOnly />
        <small>L&apos;email de connexion ne peut pas être modifié ici.</small>
      </label>

      <label>
        Téléphone
        <input
          name="telephone"
          defaultValue={profile.telephone}
          placeholder="+216 00 000 000"
          required
          maxLength={30}
        />
      </label>

      <label>
        Adresse
        <input name="adresse" defaultValue={profile.adresse} placeholder="Rue, numéro, appartement" maxLength={200} />
      </label>

      <div className="compte-profile-row">
        <label>
          Ville
          <input name="ville" defaultValue={profile.ville} maxLength={80} />
        </label>
        <label>
          Gouvernorat
          <select name="gouvernorat" defaultValue={profile.gouvernorat}>
            <option value="">Sélectionner</option>
            {governorates.map((g) => (
              <option key={g} value={g}>
                {g}
              </option>
            ))}
          </select>
        </label>
      </div>

      {state.error ? <p className="form-error">{state.error}</p> : null}
      {state.success && !state.error ? (
        <p className="compte-profile-saved">
          <Check size={15} /> Profil enregistré.
        </p>
      ) : null}

      <button type="submit" className="primary-button" disabled={pending}>
        {pending ? 'Enregistrement…' : 'Enregistrer'}
      </button>
    </form>
  )
}
