import Link from 'next/link'
import { ArrowRight, XCircle } from 'lucide-react'
import { BoutiqueShell } from '@/components/boutique-shell'

export default function PaymentFailedPage() {
  return (
    <BoutiqueShell>
      <section className="checkout-page">
        <div className="confirmation-box confirmation-box-error">
          <XCircle size={32} />
          <h1>Le paiement n&apos;a pas abouti.</h1>
          <p>
            Votre paiement en ligne a été refusé ou interrompu. Aucun montant n&apos;a été prélevé
            et les articles sont toujours dans votre panier.
          </p>
          <Link href="/commande" className="primary-button">
            Réessayer le paiement <ArrowRight size={17} />
          </Link>
        </div>
      </section>
    </BoutiqueShell>
  )
}
