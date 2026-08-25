'use client'

import { useActionState } from 'react'
import Link from 'next/link'
import { ArrowRight, MailCheck } from 'lucide-react'
import { signin, signup, type AuthState } from '@/app/compte/actions'

const initialState: AuthState = {}

export function SigninForm({ next }: { next: string }) {
  const [state, formAction, pending] = useActionState(signin, initialState)

  return (
    <form className="compte-auth-form" action={formAction}>
      <input type="hidden" name="next" value={next} />
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

      <p className="compte-auth-switch">
        Pas encore de compte ?{' '}
        <Link href={`/compte/inscription?next=${encodeURIComponent(next)}`}>Créer un compte</Link>
      </p>
    </form>
  )
}

export function SignupForm({ next }: { next: string }) {
  const [state, formAction, pending] = useActionState(signup, initialState)

  if (state.confirmationRequired) {
    return (
      <div className="compte-auth-confirm">
        <MailCheck size={28} />
        <h2>Vérifiez votre email</h2>
        <p>
          Votre compte a été créé. Cliquez sur le lien que nous venons de vous envoyer : vous
          serez connecté automatiquement.
        </p>
        <Link className="primary-button full center" href={`/compte/connexion?next=${encodeURIComponent(next)}`}>
          Aller à la connexion <ArrowRight size={17} />
        </Link>
      </div>
    )
  }

  return (
    <form className="compte-auth-form" action={formAction}>
      <input type="hidden" name="next" value={next} />
      <div className="compte-auth-row">
        <label>
          Prénom
          <input type="text" name="prenom" required autoFocus />
        </label>
        <label>
          Nom
          <input type="text" name="nom" required />
        </label>
      </div>
      <label>
        Email
        <input type="email" name="email" placeholder="vous@exemple.tn" required />
      </label>
      <label>
        Mot de passe
        <input type="password" name="password" placeholder="8 caractères minimum" required minLength={8} />
      </label>

      {state.error ? <p className="form-error">{state.error}</p> : null}

      <button className="primary-button full" type="submit" disabled={pending}>
        {pending ? 'Création…' : 'Créer mon compte'} <ArrowRight size={17} />
      </button>

      <p className="compte-auth-switch">
        Vous avez déjà un compte ?{' '}
        <Link href={`/compte/connexion?next=${encodeURIComponent(next)}`}>Se connecter</Link>
      </p>
    </form>
  )
}
