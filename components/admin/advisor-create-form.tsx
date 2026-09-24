'use client'

import { useActionState } from 'react'
import Link from 'next/link'
import { ArrowRight, UserPlus } from 'lucide-react'
import {
  createAdvisorAction,
  type AccessActionState,
} from '@/app/admin-r/(dashboard)/conseillers/actions'
import { AccessLinkNotice } from '@/components/admin/access-link-notice'
import { REGIONS, type Grade } from '@/lib/conseiller/format'

const initialState: AccessActionState = {}

export function AdvisorCreateForm({
  grades,
  sponsors,
}: {
  grades: Grade[]
  sponsors: { id: string; name: string }[]
}) {
  const [state, formAction, pending] = useActionState(createAdvisorAction, initialState)

  if (state.success && state.access && state.advisorId) {
    return (
      <section className="admin-card">
        <h2>Conseiller créé</h2>
        <AccessLinkNotice access={state.access} />
        <div className="hero-actions advisor-after-create">
          <Link href={`/admin-r/conseillers/${state.advisorId}`} className="primary-button">
            Voir la fiche <ArrowRight size={16} />
          </Link>
          <Link href="/admin-r/conseillers" className="outline-button">
            Retour à la liste
          </Link>
        </div>
      </section>
    )
  }

  return (
    <form action={formAction} className="admin-card">
      <div className="form-grid">
        <label>
          Prénom
          <input name="prenom" required autoFocus />
        </label>
        <label>
          Nom
          <input name="nom" required />
        </label>
        <label>
          Email
          <input type="email" name="email" required placeholder="conseiller@exemple.tn" />
        </label>
        <label>
          Téléphone
          <input type="tel" name="telephone" required placeholder="+216 XX XXX XXX" />
        </label>
        <label>
          Région
          <select name="region" required defaultValue="">
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
          Grade initial
          <select name="gradeId" required defaultValue={grades[0]?.id ?? ''}>
            {grades.map((grade) => (
              <option key={grade.id} value={grade.id}>
                {grade.name}
              </option>
            ))}
          </select>
        </label>
        <label className="wide">
          Parrain (upline)
          <select name="sponsorId" defaultValue="">
            <option value="">Aucun — conseiller fondateur</option>
            {sponsors.map((sponsor) => (
              <option key={sponsor.id} value={sponsor.id}>
                {sponsor.name}
              </option>
            ))}
          </select>
        </label>
      </div>

      {state.error ? <p className="form-error advisor-form-error">{state.error}</p> : null}

      <div className="admin-form-actions advisor-form-actions">
        <small className="admin-muted">
          Le conseiller reçoit un lien pour choisir son mot de passe.
        </small>
        <button type="submit" className="primary-button" disabled={pending}>
          <UserPlus size={16} /> {pending ? 'Création…' : 'Créer et inviter'}
        </button>
      </div>
    </form>
  )
}
