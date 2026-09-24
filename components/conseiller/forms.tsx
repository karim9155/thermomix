'use client'

import { useActionState } from 'react'
import { ArrowRight, Send } from 'lucide-react'
import {
  activateAccess,
  advisorLogin,
  setAdvisorPassword,
  submitRecruitApplication,
  updateOwnProfile,
  type FormState,
} from '@/app/conseiller/actions'
import { REGIONS } from '@/lib/conseiller/format'

const initialState: FormState = {}

export function AdvisorLoginForm({ notice }: { notice?: string }) {
  const [state, formAction, pending] = useActionState(advisorLogin, initialState)

  return (
    <form className="admin-login-form" action={formAction}>
      {notice && !state.error ? <p className="form-error advisor-notice">{notice}</p> : null}
      <label>
        Email
        <input type="email" name="email" placeholder="vous@exemple.tn" required autoFocus />
      </label>
      <label>
        Mot de passe
        <input type="password" name="password" placeholder="••••••••" required />
      </label>

      {state.error ? <p className="form-error">{state.error}</p> : null}

      <button className="primary-button full" type="submit" disabled={pending}>
        {pending ? 'Connexion…' : 'Se connecter'} <ArrowRight size={17} />
      </button>
    </form>
  )
}

export function ActivationForm({ tokenHash, type }: { tokenHash: string; type: string }) {
  const [state, formAction, pending] = useActionState(activateAccess, initialState)

  return (
    <form className="admin-login-form" action={formAction}>
      <input type="hidden" name="token_hash" value={tokenHash} />
      <input type="hidden" name="type" value={type} />

      {state.error ? <p className="form-error">{state.error}</p> : null}

      <button className="primary-button full" type="submit" disabled={pending || !tokenHash}>
        {pending ? 'Vérification…' : 'Continuer'} <ArrowRight size={17} />
      </button>
    </form>
  )
}

export function PasswordForm() {
  const [state, formAction, pending] = useActionState(setAdvisorPassword, initialState)

  return (
    <form className="admin-login-form" action={formAction}>
      <label>
        Nouveau mot de passe
        <input
          type="password"
          name="password"
          placeholder="8 caractères minimum"
          minLength={8}
          required
          autoFocus
        />
      </label>
      <label>
        Confirmer le mot de passe
        <input type="password" name="confirm" minLength={8} required />
      </label>

      {state.error ? <p className="form-error">{state.error}</p> : null}

      <button className="primary-button full" type="submit" disabled={pending}>
        {pending ? 'Enregistrement…' : 'Enregistrer et accéder à mon espace'}{' '}
        <ArrowRight size={17} />
      </button>
    </form>
  )
}

export function OwnProfileForm({
  values,
}: {
  values: { prenom: string; nom: string; telephone: string }
}) {
  const [state, formAction, pending] = useActionState(updateOwnProfile, initialState)

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
        <label className="wide">
          Téléphone
          <input type="tel" name="telephone" defaultValue={values.telephone} required />
        </label>
      </div>
      <div className="admin-form-actions">
        {state.error ? (
          <p className="field-error">{state.error}</p>
        ) : state.success ? (
          <p className="admin-saved-message">Profil enregistré.</p>
        ) : (
          <span />
        )}
        <button type="submit" className="primary-button" disabled={pending}>
          {pending ? 'Enregistrement…' : 'Enregistrer'}
        </button>
      </div>
    </form>
  )
}

export function ApplicationForm({ defaultRegion }: { defaultRegion: string }) {
  const [state, formAction, pending] = useActionState(submitRecruitApplication, initialState)

  if (state.success) {
    return (
      <div className="advisor-success">
        <p>
          <strong>Candidature envoyée.</strong> L&apos;administration va l&apos;examiner ; vous
          verrez sa décision dans « Mon réseau ».
        </p>
      </div>
    )
  }

  return (
    <form action={formAction} className="advisor-stack-form">
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
          <input type="email" name="email" required placeholder="recrue@exemple.tn" />
        </label>
        <label>
          Téléphone
          <input type="tel" name="telephone" required placeholder="+216 XX XXX XXX" />
        </label>
        <label className="wide">
          Région
          <select name="region" defaultValue={defaultRegion} required>
            {REGIONS.map((region) => (
              <option key={region} value={region}>
                {region}
              </option>
            ))}
          </select>
        </label>
        <label className="wide">
          Notes pour l&apos;administration (facultatif)
          <textarea name="notes" rows={3} placeholder="Comment vous vous connaissez, motivation…" />
        </label>
      </div>

      {state.error ? <p className="field-error">{state.error}</p> : null}

      <div className="admin-form-actions">
        <span />
        <button type="submit" className="primary-button" disabled={pending}>
          <Send size={16} /> {pending ? 'Envoi…' : 'Envoyer la candidature'}
        </button>
      </div>
    </form>
  )
}
