import { redirect } from 'next/navigation'
import { BoutiqueShell } from '@/components/boutique-shell'
import { CheckoutForm } from '@/components/checkout-form'
import { getCustomer } from '@/lib/compte/guard'
import { getLastOrderDetails } from '@/lib/compte/orders'

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

  // Prefer the last order's details — they are a real delivery address the
  // customer already used — and fall back to what signup captured.
  const last = await getLastOrderDetails()

  return (
    <BoutiqueShell>
      <CheckoutForm
        prefill={{
          prenom: last?.prenom || customer.prenom,
          nom: last?.nom || customer.nom,
          email: customer.email,
          telephone: last?.telephone ?? '',
          adresse: last?.adresse ?? '',
          ville: last?.ville ?? '',
          gouvernorat: last?.gouvernorat ?? '',
        }}
      />
    </BoutiqueShell>
  )
}
