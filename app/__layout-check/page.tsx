// TEMPORARY layout-verification harness — delete after checking.
import { BoutiqueShell } from '@/components/boutique-shell'
import { CheckoutForm } from '@/components/checkout-form'

export const dynamic = 'force-dynamic'

export default function LayoutCheckPage() {
  return (
    <BoutiqueShell>
      <CheckoutForm
        prefill={{
          prenom: 'Test', nom: 'User', email: 'test@example.com',
          telephone: '20000000', adresse: '1 rue de test',
          ville: 'La Marsa', gouvernorat: 'Tunis',
        }}
      />
    </BoutiqueShell>
  )
}
