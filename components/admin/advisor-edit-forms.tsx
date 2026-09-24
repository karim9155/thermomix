'use client'

import { useActionState } from 'react'
import {
  changeGradeAction,
  changeSponsorAction,
  updateAdvisorAction,
  type ActionState,
} from '@/app/admin-r/(dashboard)/conseillers/actions'
import { REGIONS, type Grade } from '@/lib/conseiller/format'

const initialState: ActionState = {}

function Feedback({ state, saved }: { state: ActionState; saved: string }) {
  if (state.error) return <p className="field-error">{state.error}</p>
  if (state.success) return <p className="admin-saved-message">{saved}</p>
  return null
}

/** Identity and region (A5 from the admin side, B9). */
export function AdvisorIdentityForm({
  advisorId,
  values,
}: {
  advisorId: string
  values: { prenom: string; nom: string; telephone: string; region: string }
}) {
  const [state, formAction, pending] = useActionState(
    updateAdvisorAction.bind(null, advisorId),
    initialState,
  )

  return (
    <form action={formAction} className="advisor-stack-form">
      <div className="form-grid">
        <label>
          Prénom
          <input name="prenom" defaultValue={values.prenom} required />
        </label>
        <label>
          Nom
          <input name="nom" defaultValue={values.nom} required />
        </label>
        <label>
          Téléphone
          <input type="tel" name="telephone" defaultValue={values.telephone} required />
        </label>
        <label>
          Région
          <select name="region" defaultValue={values.region} required>
            {REGIONS.map((region) => (
              <option key={region} value={region}>
                {region}
              </option>
            ))}
          </select>
        </label>
      </div>
      <div className="admin-form-actions">
        <Feedback state={state} saved="Enregistré." />
        <button type="submit" className="outline-button" disabled={pending}>
          {pending ? 'Enregistrement…' : 'Enregistrer'}
        </button>
      </div>
    </form>
  )
}

/** Manual promotion or demotion, always with a reason (F6). */
export function AdvisorGradeForm({
  advisorId,
  currentGradeId,
  grades,
}: {
  advisorId: string
  currentGradeId: string
  grades: Grade[]
}) {
  const [state, formAction, pending] = useActionState(
    changeGradeAction.bind(null, advisorId),
    initialState,
  )

  return (
    <form action={formAction} className="advisor-stack-form form-grid">
      <label>
        Nouveau grade
        <select name="gradeId" defaultValue={currentGradeId} required>
          {grades.map((grade) => (
            <option key={grade.id} value={grade.id}>
              {grade.name}
            </option>
          ))}
        </select>
      </label>
      <label>
        Motif
        <input name="reason" required minLength={3} placeholder="Ex. objectifs atteints" />
      </label>
      <div className="admin-form-actions wide">
        <Feedback state={state} saved="Grade mis à jour." />
        <button type="submit" className="outline-button" disabled={pending}>
          {pending ? 'Enregistrement…' : 'Changer le grade'}
        </button>
      </div>
    </form>
  )
}

/**
 * Moves the advisor, with their whole sub-branch, under another sponsor
 * (B6). The advisor's own branch is left out of the choices; the database
 * refuses it anyway.
 */
export function AdvisorSponsorForm({
  advisorId,
  currentSponsorId,
  sponsors,
}: {
  advisorId: string
  currentSponsorId: string | null
  sponsors: { id: string; name: string }[]
}) {
  const [state, formAction, pending] = useActionState(
    changeSponsorAction.bind(null, advisorId),
    initialState,
  )

  return (
    <form action={formAction} className="advisor-stack-form form-grid">
      <label>
        Nouveau parrain
        <select name="sponsorId" defaultValue={currentSponsorId ?? ''}>
          <option value="">Aucun — conseiller fondateur</option>
          {sponsors.map((sponsor) => (
            <option key={sponsor.id} value={sponsor.id}>
              {sponsor.name}
            </option>
          ))}
        </select>
      </label>
      <label>
        Motif
        <input name="reason" required minLength={3} placeholder="Ex. changement d'équipe" />
      </label>
      <div className="admin-form-actions wide">
        <Feedback state={state} saved="Parrain mis à jour." />
        <button type="submit" className="outline-button" disabled={pending}>
          {pending ? 'Enregistrement…' : 'Réaffecter'}
        </button>
      </div>
    </form>
  )
}
