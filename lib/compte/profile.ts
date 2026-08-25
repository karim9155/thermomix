import 'server-only'
import { createClient } from '@/lib/supabase/customer-auth'

export type Profile = {
  prenom: string
  nom: string
  telephone: string
  adresse: string
  ville: string
  gouvernorat: string
}

export const EMPTY_PROFILE: Profile = {
  prenom: '',
  nom: '',
  telephone: '',
  adresse: '',
  ville: '',
  gouvernorat: '',
}

const SELECT = 'prenom, nom, telephone, adresse, ville, gouvernorat'

/**
 * The caller's own profile, or undefined if they have never saved one.
 *
 * Reads through the customer's session, so migration 0007's RLS decides
 * what comes back — there is no user_id filter here on purpose, because
 * the policy is the filter and cannot be forgotten.
 */
export async function getProfile(): Promise<Profile | undefined> {
  const supabase = await createClient()

  const { data, error } = await supabase.from('profiles').select(SELECT).maybeSingle()

  if (error || !data) return undefined

  const row = data as Record<string, string | null>
  return {
    prenom: row.prenom ?? '',
    nom: row.nom ?? '',
    telephone: row.telephone ?? '',
    adresse: row.adresse ?? '',
    ville: row.ville ?? '',
    gouvernorat: row.gouvernorat ?? '',
  }
}

/**
 * Creates or updates the caller's profile.
 *
 * user_id comes from the verified session and is never accepted from the
 * client; the RLS with-check would reject a foreign id anyway, so the two
 * agree rather than relying on either alone.
 */
export async function saveProfile(userId: string, profile: Profile): Promise<void> {
  const supabase = await createClient()

  const { error } = await supabase.from('profiles').upsert(
    {
      user_id: userId,
      ...profile,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'user_id' },
  )

  if (error) {
    throw new Error(`Impossible d'enregistrer le profil : ${error.message}`)
  }
}
