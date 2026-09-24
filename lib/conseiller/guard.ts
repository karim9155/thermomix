import 'server-only'
import { cache } from 'react'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/advisor-auth'
import type { AdvisorStatus } from '@/lib/conseiller/format'

export type AdvisorUser = {
  id: string
  email: string
  prenom: string
  nom: string
  status: AdvisorStatus
}

type Session =
  | { user: null; advisor: null }
  | { user: { id: string; email: string }; advisor: AdvisorUser | null }

/**
 * The one lookup every advisor guard shares: getUser() (re-validated
 * against Supabase Auth, never a decoded cookie) and then the caller's own
 * `advisors` row through the cookie client, which migration 0013's
 * self-read policy allows and nothing else does.
 *
 * Status is read fresh on every request. That is what makes suspension
 * immediate: a suspended advisor's session is still valid, but the next
 * page or action they hit sees `suspendu` and refuses.
 *
 * cache() is per-request only, like requireAdmin().
 */
export const getAdvisorSession = cache(async (): Promise<Session> => {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return { user: null, advisor: null }

  const { data } = await supabase
    .from('advisors')
    .select('user_id, email, prenom, nom, status')
    .eq('user_id', user.id)
    .maybeSingle()

  const sessionUser = { id: user.id, email: user.email ?? '' }

  if (!data) return { user: sessionUser, advisor: null }

  return {
    user: sessionUser,
    advisor: {
      id: data.user_id,
      email: data.email,
      prenom: data.prenom,
      nom: data.nom,
      status: data.status as AdvisorStatus,
    },
  }
})

/**
 * For Server Actions and Route Handlers: throws instead of redirecting,
 * like requireAdmin(). A redirect() thrown inside an action's try/catch
 * would be caught and shown as an error message, so actions get a plain
 * Error they can report.
 *
 * `allowPending` lets an invited advisor who has not set a password yet
 * through — only the set-password action needs that.
 */
export async function requireAdvisor(
  options: { allowPending?: boolean } = {},
): Promise<AdvisorUser> {
  const { advisor } = await getAdvisorSession()

  if (!advisor) {
    throw new Error("Accès refusé : ce compte n'est pas un compte conseiller.")
  }
  if (advisor.status === 'suspendu') {
    throw new Error("Votre compte conseiller est suspendu. Contactez l'administration.")
  }
  if (advisor.status === 'invite' && !options.allowPending) {
    throw new Error('Définissez votre mot de passe pour activer votre compte.')
  }

  return advisor
}

/**
 * For pages and layouts under /conseiller: sends the visitor wherever
 * they need to go instead of rendering an error.
 *
 * proxy.ts already pre-filters /conseiller, but it is not the security
 * boundary (Next's proxy guide is explicit about that) — every page
 * re-checks here.
 */
export async function requireAdvisorPage(): Promise<AdvisorUser> {
  const { advisor } = await getAdvisorSession()

  if (!advisor) redirect('/conseiller/connexion')
  if (advisor.status === 'suspendu') redirect('/conseiller/connexion?erreur=suspendu')
  if (advisor.status === 'invite') redirect('/conseiller/mot-de-passe')

  return advisor
}
