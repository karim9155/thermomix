'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
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

const MAX_THUMBNAILS = 12

export function ProductDetail({ product, related }: { product: Product; related: Product[] }) {
  const [quantity, setQuantity] = useState(1)
  const [selectedIndex, setSelectedIndex] = useState(0)
  const { addItem } = useCart()
  const toast = useToast()

  const trackRef = useRef<HTMLDivElement>(null)
  // Set while a thumbnail click is animating the track, so the scroll
  // events that animation fires don't fight the index we just set.
  const scrollingTo = useRef<number | null>(null)

  const gallery =
    product.images.length > 0
      ? product.images.slice(0, MAX_THUMBNAILS)
      : [{ url: product.image, alt: product.name, position: 0 }]

  /**
   * Moves the gallery to an image. On touch layouts the track is a real
   * scroller, so scroll it; on desktop it has no overflow and scrollTo is
   * a no-op, leaving CSS to park the selected slide. Either way
   * selectedIndex is the source of truth for the thumbnails.
   */
  const showImage = useCallback((index: number) => {
    setSelectedIndex(index)

    const track = trackRef.current
    if (!track) return

    const slide = track.children[index] as HTMLElement | undefined
    if (!slide) return

    scrollingTo.current = index
    track.scrollTo({ left: slide.offsetLeft - track.offsetLeft, behavior: 'smooth' })
  }, [])

  /**
   * Swiping writes the position back so the active thumbnail follows the
   * image. Picks the slide whose centre is nearest the track's centre,
   * which behaves correctly with two slides — where a width-based guess
   * tends to round to the wrong one at the extremes.
   */
  const handleScroll = useCallback(() => {
    const track = trackRef.current
    if (!track) return

    const centre = track.scrollLeft + track.clientWidth / 2
    let nearest = 0
    let smallest = Infinity

    for (let i = 0; i < track.children.length; i++) {
      const slide = track.children[i] as HTMLElement
      const slideCentre = slide.offsetLeft - track.offsetLeft + slide.clientWidth / 2
      const distance = Math.abs(slideCentre - centre)
      if (distance < smallest) {
        smallest = distance
        nearest = i
      }
    }

    // Ignore the tail of a click-driven smooth scroll until it lands.
    if (scrollingTo.current !== null) {
      if (scrollingTo.current === nearest) scrollingTo.current = null
      return
    }

    setSelectedIndex((current) => (current === nearest ? current : nearest))
  }, [])

  // Keep the track aligned when the viewport crosses the breakpoint, so
  // resizing from desktop to mobile doesn't strand it between slides.
  useEffect(() => {
    function handleResize() {
      const track = trackRef.current
      if (!track) return
      const slide = track.children[selectedIndex] as HTMLElement | undefined
      if (!slide) return
      track.scrollTo({ left: slide.offsetLeft - track.offsetLeft, behavior: 'auto' })
    }
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [selectedIndex])

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
          {/* One track holding every image. On desktop it never scrolls —
              CSS parks it on the selected slide, so clicking a thumbnail
              swaps the picture exactly as before. On touch it is a
              scroll-snap carousel and the scroll position drives
              selectedIndex back. */}
          <div className="detail-image" ref={trackRef} onScroll={handleScroll}>
            {gallery.map((image, index) => (
              <div
                className={index === selectedIndex ? 'detail-slide selected' : 'detail-slide'}
                key={image.url + index}
              >
                <Image
                  src={image.url}
                  alt={image.alt ?? product.name}
                  width={1000}
                  height={1000}
                  sizes="(max-width: 900px) 100vw, 620px"
                  priority={index === 0}
                  data-placeholder={isPlaceholderImage(image.url) ? '' : undefined}
                  unoptimized={isPlaceholderImage(image.url)}
                />
              </div>
            ))}
          </div>

          {gallery.length > 1 ? (
            <>
              <p className="detail-image-count" aria-live="polite">
                {selectedIndex + 1} / {gallery.length}
              </p>
              <div className="thumbs">
                {gallery.map((image, index) => (
                  <button
                    type="button"
                    key={image.url + index}
                    className={index === selectedIndex ? 'selected' : ''}
                    aria-label={`Voir la photo ${index + 1} de ${product.name}`}
                    aria-current={index === selectedIndex}
                    onClick={() => showImage(index)}
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
            </>
          ) : null}
        </div>

        <div className="detail-copy">
          <p className="eyebrow">
            {product.category === 'robot' ? 'Thermomix®' : 'Accessoires'}
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

            {product.features.length > 0 ? (
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
            ) : null}

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
                    ? 'Le Thermomix® TM7 bénéficie de 2 ans de garantie officielle Vorwerk, assurée par INOCASA en Tunisie.'
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
