'use client'

import { Dialog } from '@base-ui/react/dialog'
import Image from 'next/image'
import Link from 'next/link'
import { Minus, Plus, Trash2, X } from 'lucide-react'
import { useCart } from '@/lib/cart-context'
import { formatPrice, isPlaceholderImage } from '@/lib/product-format'

export function CartDrawer({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const { items, updateQuantity, removeItem, itemCount, totalTTC } = useCart()

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Backdrop className="cart-drawer-backdrop" />
        <Dialog.Popup className="cart-drawer-popup">
          <div className="cart-drawer-header">
            <Dialog.Title className="cart-drawer-title">
              Votre panier {itemCount > 0 ? `(${itemCount})` : ''}
            </Dialog.Title>
            <Dialog.Close className="icon-button" aria-label="Fermer le panier">
              <X size={20} />
            </Dialog.Close>
          </div>

          {items.length === 0 ? (
            <div className="cart-drawer-empty">
              <p>Votre panier est vide.</p>
              <Link href="/boutique" className="primary-button" onClick={() => onOpenChange(false)}>
                Découvrir la boutique
              </Link>
            </div>
          ) : (
            <>
              <div className="cart-drawer-items">
                {items.map((item) => (
                  <div className="cart-drawer-item" key={item.slug}>
                    <Image
                      src={item.image}
                      alt={item.name}
                      width={112}
                      height={112}
                      className="cart-drawer-item-image"
                      unoptimized={isPlaceholderImage(item.image)}
                    />
                    <div className="cart-drawer-item-copy">
                      <h3>{item.name}</h3>
                      <p>Réf. {item.sku}</p>
                      <strong>{formatPrice(item.priceTTC)}</strong>
                    </div>
                    <div className="cart-drawer-item-actions">
                      <div className="quantity quantity-sm">
                        <button
                          type="button"
                          aria-label={`Diminuer la quantité de ${item.name}`}
                          onClick={() => updateQuantity(item.slug, item.quantity - 1)}
                        >
                          <Minus size={13} />
                        </button>
                        <span>{item.quantity}</span>
                        <button
                          type="button"
                          aria-label={`Augmenter la quantité de ${item.name}`}
                          onClick={() => updateQuantity(item.slug, item.quantity + 1)}
                        >
                          <Plus size={13} />
                        </button>
                      </div>
                      <button
                        type="button"
                        className="icon-button"
                        aria-label={`Supprimer ${item.name} du panier`}
                        onClick={() => removeItem(item.slug)}
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              <div className="cart-drawer-footer">
                <div className="cart-drawer-total">
                  <span>Total TTC</span>
                  <strong>{formatPrice(totalTTC)}</strong>
                </div>
                <Link
                  href="/panier"
                  className="outline-button full center"
                  onClick={() => onOpenChange(false)}
                >
                  Voir le panier
                </Link>
                <Link
                  href="/commande"
                  className="primary-button full"
                  onClick={() => onOpenChange(false)}
                >
                  Passer la commande
                </Link>
              </div>
            </>
          )}
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
