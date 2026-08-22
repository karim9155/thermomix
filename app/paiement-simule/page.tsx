import { Suspense } from 'react'
import { BoutiqueShell } from '@/components/boutique-shell'
import { SimulatedPayment } from '@/components/simulated-payment'

export default function SimulatedPaymentPage() {
  return (
    <BoutiqueShell>
      <Suspense fallback={<section className="checkout-page" />}>
        <SimulatedPayment />
      </Suspense>
    </BoutiqueShell>
  )
}
