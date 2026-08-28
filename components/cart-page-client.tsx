'use client'

import Image from 'next/image'
import Link from 'next/link'
import { ArrowRight, Minus, Plus, Trash2 } from 'lucide-react'
import { useCart } from '@/lib/cart-context'
import { formatPrice, formatPriceHT, isPlaceholderImage } from '@/lib/product-format'

export function CartPageClient() {
  const { items, updateQuantity, removeItem, subtotalHT, totalTVA, totalTTC } = useCart()

  return (
    <section className="checkout-page">
      <p className="eyebrow">VOTRE SÉLECTION</p>
      <h1>Votre panier.</h1>

      {items.length === 0 ? (
        <div className="cart-empty">
          <p>Votre panier est vide.</p>
          <Link href="/boutique" className="primary-button">
            Découvrir la boutique <ArrowRight size={17} />
          </Link>
        </div>
      ) : (
        <div className="cart-layout">
          <div className="cart-items">
            {items.map((item) => (
              <div className="cart-item" key={item.slug}>
                <div className="mini-visual">
                  <Image
                    src={item.image}
                    alt={item.name}
                    width={190}
                    height={190}
                    unoptimized={isPlaceholderImage(item.image)}
                  />
                </div>
                <div className="cart-item-copy">
                  <h3>{item.name}</h3>
                  <p>Réf. {item.sku}</p>
                  {/* HT, like the line total and the Sous-total HT row in
                      the summary — the TVA is broken out once there. */}
                  <strong>{formatPriceHT(item.priceHT)}</strong>
                </div>
                <div className="quantity">
                  <button
                    type="button"
                    aria-label={`Diminuer la quantité de ${item.name}`}
                    onClick={() => updateQuantity(item.slug, item.quantity - 1)}
                  >
                    <Minus size={14} />
                  </button>
                  <span>{item.quantity}</span>
                  <button
                    type="button"
                    aria-label={`Augmenter la quantité de ${item.name}`}
                    onClick={() => updateQuantity(item.slug, item.quantity + 1)}
                  >
                    <Plus size={14} />
                  </button>
                </div>
                <strong className="cart-item-line-total">
                  {formatPriceHT(item.priceHT * item.quantity)}
                </strong>
                <button
                  className="icon-button"
                  aria-label={`Supprimer ${item.name} du panier`}
                  onClick={() => removeItem(item.slug)}
                >
                  <Trash2 size={17} />
                </button>
              </div>
            ))}
          </div>

          <aside className="summary">
            <h2>Résumé</h2>
            <div>
              <span>Sous-total HT</span>
              <strong>{formatPriceHT(subtotalHT)}</strong>
            </div>
            <div>
              <span>TVA (19%)</span>
              <strong>{formatPrice(totalTVA)}</strong>
            </div>
            <hr />
            {/* The final line here, not an intermediate row — the cart
                has no delivery fee or stamp yet (both depend on choices
                made at checkout), so this stays the explicit TTC total. */}
            <div className="summary-total">
              <span>Total TTC</span>
              <strong>{formatPrice(totalTTC)}</strong>
            </div>
            <Link href="/commande" className="primary-button full">
              Passer la commande <ArrowRight size={17} />
            </Link>
          </aside>
        </div>
      )}
    </section>
  )
}
