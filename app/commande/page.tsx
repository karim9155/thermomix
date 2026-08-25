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
  const customer = await getCustomer()

  if (!customer) {
    redirect(`/compte/connexion?next=${encodeURIComponent('/commande')}`)
  }

  // Saved profile first — it is what the customer explicitly chose to keep
  // — then the last order's address, then whatever signup captured.
  const [profile, last] = await Promise.all([getProfile(), getLastOrderDetails()])

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
