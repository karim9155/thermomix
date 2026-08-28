import Link from 'next/link'
import { ArrowRight, CheckCircle2, MapPin } from 'lucide-react'
import { BoutiqueShell } from '@/components/boutique-shell'
import { ClearCartOnMount } from '@/components/clear-cart-on-mount'
import { getOrder } from '@/lib/orders'
import { formatPrice, BOUTIQUE_ADDRESS_LABEL } from '@/lib/product-format'

export default async function ConfirmationPage({
  searchParams,
}: {
  searchParams: Promise<{ ref?: string }>
}) {
  const { ref } = await searchParams
  const order = ref ? await getOrder(ref) : undefined

  if (!order) {
    return (
      <BoutiqueShell>
        <section className="checkout-page">
          <div className="cart-empty">
            <p>Nous ne trouvons pas cette commande. Vérifiez le lien ou contactez-nous.</p>
            <Link href="/boutique" className="primary-button">
              Retour à la boutique <ArrowRight size={17} />
            </Link>
          </div>
        </section>
      </BoutiqueShell>
    )
  }

  return (
    <BoutiqueShell>
      <ClearCartOnMount />
      <section className="checkout-page">
        <div className="confirmation-box">
          <CheckCircle2 size={32} />
          <p className="confirmation-reference">{order.reference}</p>
          {/* No new order can be 'en_ligne' — checkout is cash only — but
              the branch stays for any historical order placed before that
              was true, which would otherwise read as cash on delivery. */}
          <p>
            {order.paymentMethod === 'cash'
              ? order.customer.deliveryMethod === 'boutique'
                ? 'Merci ! Votre commande est confirmée. Elle vous attendra en boutique — vous paierez sur place au retrait.'
                : 'Merci ! Votre commande est confirmée. Un conseiller INOCASA vous contactera sous 24h pour organiser la livraison. Vous paierez à la réception.'
              : 'Merci ! Votre paiement a bien été reçu.'}
          </p>
          {order.customer.deliveryMethod === 'boutique' ? (
            <p className="confirmation-pickup-address">
              <MapPin size={15} /> {BOUTIQUE_ADDRESS_LABEL}
            </p>
          ) : null}
        </div>

        <div className="cart-layout">
          <div className="cart-items">
            {order.items.map((item) => (
              <div className="cart-item" key={item.sku}>
                <div className="cart-item-copy">
                  <h3>{item.name}</h3>
                  <p>
                    Réf. {item.sku} · Qté {item.quantity}
                  </p>
                </div>
                <strong className="cart-item-line-total">
                  {formatPrice(item.priceTTC * item.quantity)}
                </strong>
              </div>
            ))}
          </div>

          <aside className="summary">
            <h2>Récapitulatif</h2>
            <div>
              <span>Sous-total HT</span>
              <strong>{formatPrice(order.subtotalHT)}</strong>
            </div>
            <div>
              <span>TVA (19%)</span>
              <strong>{formatPrice(order.totalTVA)}</strong>
            </div>
            <div>
              <span>Total TTC</span>
              <strong>{formatPrice(order.totalTTC)}</strong>
            </div>
            {order.timbreFiscal > 0 ? (
              <div>
                <span>Timbre fiscal</span>
                <strong>{formatPrice(order.timbreFiscal)}</strong>
              </div>
            ) : null}
            <hr />
            <div className="summary-total">
              <span>Total à payer</span>
              <strong>{formatPrice(order.totalTTC + order.timbreFiscal)}</strong>
            </div>
          </aside>
        </div>

        {/* Outside the summary card: these act on the order as a whole,
            not on the totals above them. */}
        <div className="confirmation-actions">
          <Link href="/compte" className="primary-button full center">
            Voir mes commandes <ArrowRight size={16} />
          </Link>
          <Link href="/boutique" className="outline-button full center">
            Continuer mes achats
          </Link>
        </div>
      </section>
    </BoutiqueShell>
  )
}
