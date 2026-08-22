'use client'

import { useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { ArrowLeft, ArrowRight, Check, Minus, Plus } from 'lucide-react'
import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionPanel,
} from '@/components/ui/accordion'
import { ProductCard } from '@/components/boutique'
import { useCart } from '@/lib/cart-context'
import { useToast } from '@/components/ui/toast'
import { formatPrice, isPlaceholderImage, type Product } from '@/lib/product-format'

const MAX_THUMBNAILS = 6

export function ProductDetail({ product, related }: { product: Product; related: Product[] }) {
  const [quantity, setQuantity] = useState(1)
  const [selectedIndex, setSelectedIndex] = useState(0)
  const { addItem } = useCart()
  const toast = useToast()

  const gallery =
    product.images.length > 0
      ? product.images.slice(0, MAX_THUMBNAILS)
      : [{ url: product.image, alt: product.name, position: 0 }]
  const selected = gallery[Math.min(selectedIndex, gallery.length - 1)]

  function handleAdd() {
    addItem(product, quantity)
    toast.add({
      title: 'Ajouté au panier',
      description: `${product.name} × ${quantity}`,
      timeout: 3000,
    })
  }

  return (
    <div className="detail">
      <Link href="/boutique" className="back-link">
        <ArrowLeft size={16} /> Retour à la boutique
      </Link>

      <div className="detail-grid">
        <div>
          <div className="detail-image">
            <Image
              key={selected.url}
              src={selected.url}
              alt={selected.alt ?? product.name}
              width={800}
              height={800}
              priority
              unoptimized={isPlaceholderImage(selected.url)}
            />
          </div>
          {gallery.length > 1 ? (
            <div className="thumbs">
              {gallery.map((image, index) => (
                <button
                  type="button"
                  key={image.url + index}
                  className={index === selectedIndex ? 'selected' : ''}
                  aria-label={`Voir la photo ${index + 1} de ${product.name}`}
                  aria-current={index === selectedIndex}
                  onClick={() => setSelectedIndex(index)}
                >
                  <Image
                    src={image.url}
                    alt=""
                    width={120}
                    height={120}
                    unoptimized={isPlaceholderImage(image.url)}
                  />
                </button>
              ))}
            </div>
          ) : null}
        </div>

        <div className="detail-copy">
          <p className="eyebrow">
            {product.category === 'robot' ? 'Thermomix® TM7' : 'Accessoires'}
          </p>
          <h1>{product.name}</h1>
          <p className="detail-subtitle">Réf. {product.sku}</p>

          <strong className="detail-price">{formatPrice(product.priceTTC)}</strong>
          <p className="detail-tva-note">Prix TTC, TVA 19% incluse</p>

          <p>{product.shortDescription}</p>

          <div className="quantity">
            <button
              type="button"
              aria-label="Diminuer la quantité"
              onClick={() => setQuantity((value) => Math.max(1, value - 1))}
            >
              <Minus size={15} />
            </button>
            <span>{quantity}</span>
            <button
              type="button"
              aria-label="Augmenter la quantité"
              onClick={() => setQuantity((value) => value + 1)}
            >
              <Plus size={15} />
            </button>
          </div>

          <button type="button" className="primary-button full" onClick={handleAdd}>
            Ajouter au panier <ArrowRight size={17} />
          </button>

          {product.included ? (
            <div className="included">
              <h3>Ce qui est inclus</h3>
              {product.included.map((item) => (
                <div key={item}>
                  <Check size={16} />
                  {item}
                </div>
              ))}
            </div>
          ) : null}

          <Accordion className="accordions" defaultValue={['description']}>
            <AccordionItem value="description">
              <AccordionTrigger>Description</AccordionTrigger>
              <AccordionPanel>
                {product.description.split('\n\n').map((paragraph, index) => (
                  <p key={index}>{paragraph}</p>
                ))}
              </AccordionPanel>
            </AccordionItem>

            <AccordionItem value="caracteristiques">
              <AccordionTrigger>Caractéristiques</AccordionTrigger>
              <AccordionPanel>
                <ul>
                  {product.features.map((feature) => (
                    <li key={feature}>{feature}</li>
                  ))}
                </ul>
              </AccordionPanel>
            </AccordionItem>

            {product.included ? (
              <AccordionItem value="inclus">
                <AccordionTrigger>Ce qui est inclus</AccordionTrigger>
                <AccordionPanel>
                  <ul>
                    {product.included.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                </AccordionPanel>
              </AccordionItem>
            ) : null}

            <AccordionItem value="livraison">
              <AccordionTrigger>Livraison &amp; retours</AccordionTrigger>
              <AccordionPanel>
                <p>
                  Livraison partout en Tunisie sous 2 à 5 jours ouvrés. Retour possible sous 14
                  jours pour tout produit non ouvert et dans son emballage d&apos;origine.
                </p>
              </AccordionPanel>
            </AccordionItem>

            <AccordionItem value="garantie">
              <AccordionTrigger>Garantie</AccordionTrigger>
              <AccordionPanel>
                <p>
                  {product.category === 'robot'
                    ? 'Le Thermomix® TM7 bénéficie de 3 ans de garantie officielle Vorwerk, assurée par INOCASA en Tunisie.'
                    : "Pièce d'origine Vorwerk, couverte par la garantie légale en vigueur en Tunisie."}
                </p>
              </AccordionPanel>
            </AccordionItem>
          </Accordion>
        </div>
      </div>

      {related.length > 0 ? (
        <section className="related">
          <div className="section-heading">
            <h2>Vous aimerez aussi</h2>
          </div>
          <div className="product-grid">
            {related.map((item) => (
              <ProductCard key={item.slug} product={item} />
            ))}
          </div>
        </section>
      ) : null}
    </div>
  )
}
