'use client'

import { useActionState } from 'react'
import { ArrowRight } from 'lucide-react'
import { login, type LoginState } from '@/app/admin-r/login/actions'

const initialState: LoginState = {}

export function LoginForm() {
  const [state, formAction, pending] = useActionState(login, initialState)

  return (
    <form className="admin-login-form" action={formAction}>
      <label>
        Email
        <input type="email" name="email" placeholder="vous@inocasa.tn" required autoFocus />
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
