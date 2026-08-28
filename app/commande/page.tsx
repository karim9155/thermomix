import { redirect } from 'next/navigation'
import { BoutiqueShell } from '@/components/boutique-shell'
import { CheckoutForm } from '@/components/checkout-form'
import { getCustomer } from '@/lib/compte/guard'
import { getLastOrderDetails } from '@/lib/compte/orders'
import { getProfile } from '@/lib/compte/profile'

// Checkout needs a session: /api/commande rejects a sessionless order, so
// send the user to sign in first rather than letting them fill the whole
// form and fail at submit. The cart lives in localStorage, so it survives
// the round trip and is still there when they come back.
//
// /commande isn't in the proxy matcher — this is its own gate, because the
// customer must land back HERE afterwards, not on /compte.
export const dynamic = 'force-dynamic'

export default async function CheckoutPage() {
  // All three start together. The session check used to be awaited on its
  // own first, which made the page cost two serial Supabase round-trips
  // before any HTML could stream — the reason this button felt dead for
  // most of a second after the click.
  //
  // Starting the prefill reads before the session is confirmed is safe
  // because both go through the customer's own session, so RLS scopes
  // them to that customer's rows (migrations 0006/0007): a sessionless
  // request reads nothing rather than someone else's address, and the
  // redirect below still fires before anything renders. Both helpers
  // swallow their errors and return undefined, so neither can lose the
  // race against the redirect the way a throwing query would.
  const customerPromise = getCustomer()
  const profilePromise = getProfile()
  const lastPromise = getLastOrderDetails()

  const customer = await customerPromise

  if (!customer) {
    redirect(`/compte/connexion?next=${encodeURIComponent('/commande')}`)
  }

  // Saved profile first — it is what the customer explicitly chose to keep
  // — then the last order's address, then whatever signup captured.
  const profile = await profilePromise
  const last = await lastPromise

  return (
    <BoutiqueShell>
      <CheckoutForm
        prefill={{
          prenom: profile?.prenom || last?.prenom || customer.prenom,
          nom: profile?.nom || last?.nom || customer.nom,
          email: customer.email,
          telephone: profile?.telephone || last?.telephone || '',
          adresse: profile?.adresse || last?.adresse || '',
          ville: profile?.ville || last?.ville || '',
          gouvernorat: profile?.gouvernorat || last?.gouvernorat || '',
        }}
      />
    </BoutiqueShell>
  )
}
