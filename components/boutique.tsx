'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useMemo, useState } from 'react'
import {
  ArrowRight,
  Search,
  ShieldCheck,
  ShoppingBag,
  Truck,
  User,
  Headphones,
  X,
} from 'lucide-react'
import { formatPrice, isPlaceholderImage, type Product } from '@/lib/product-format'
import { useCart } from '@/lib/cart-context'
import { useToast } from '@/components/ui/toast'
import { CartDrawer } from '@/components/cart-drawer'
import { SiteNav } from '@/components/site-nav'
import { AccountButton } from '@/components/account-button'


export function BrandLockup({ dark = false }: { dark?: boolean }) {
  return (
    <Image
      className={`brand-lockup ${dark ? 'brand-dark' : ''}`}
      src="/Vorwerk_TM_OD_horizontal_M_RGB.png"
      alt="Thermomix by Vorwerk — Official Distributor"
      width={3911}
      height={757}
      sizes="220px"
      priority
    />
  )
}

export function ICMark() {
  return (
    <Image
      className="ic-mark"
      src="/official.png"
      alt="INOCASA"
      width={300}
      height={300}
      sizes="48px"
      priority
    />
  )
}

function SearchOverlay({ products, onClose }: { products: Product[]; onClose: () => void }) {
  const [query, setQuery] = useState('')
  const router = useRouter()

  const results = useMemo(() => {
    const term = query.trim().toLowerCase()
    if (!term) return []
    return products
      .filter(
        (product) =>
          product.name.toLowerCase().includes(term) || product.sku.toLowerCase().includes(term),
      )
      .slice(0, 6)
  }, [query, products])

  function goToProduct(product: Product) {
    onClose()
    router.push(`/boutique/${product.slug}`)
  }

  return (
    <div className="search-overlay">
      <button aria-label="Fermer la recherche" onClick={onClose}>
        <X />
      </button>
      <div className="search-overlay-content">
        <input
          autoFocus
          placeholder="Que recherchez-vous ? (nom ou Réf.)"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
        {query.trim() ? (
          <ul className="search-results">
            {results.length === 0 ? (
              <li className="search-empty">Aucun produit ne correspond à « {query} ».</li>
            ) : (
              results.map((product) => (
                <li key={product.slug}>
                  <button type="button" onClick={() => goToProduct(product)}>
                    <Image
                      src={product.image}
                      alt={product.name}
                      width={88}
                      height={88}
                      unoptimized={isPlaceholderImage(product.image)}
                    />
                    <span className="search-result-copy">
                      <strong>{product.name}</strong>
                      <small>Réf. {product.sku}</small>
                    </span>
                    <span className="search-result-price">{formatPrice(product.priceTTC)}</span>
                  </button>
                </li>
              ))
            )}
          </ul>
        ) : null}
      </div>
    </div>
  )
}

export function Header({ products }: { products: Product[] }) {
  const [search, setSearch] = useState(false)
  const [cartOpen, setCartOpen] = useState(false)
  const { itemCount } = useCart()

  return (
    <>
      <header className="site-header">
        <Link href="/boutique" className="header-brand">
          <BrandLockup />
        </Link>

        <SiteNav onSearch={() => setSearch(true)} />

        <div className="header-actions">
          <button className="icon-button" aria-label="Rechercher" onClick={() => setSearch(true)}>
            <Search size={20} />
          </button>
          <AccountButton />
          <button
            className="icon-button bag"
            aria-label="Ouvrir le panier"
            onClick={() => setCartOpen(true)}
          >
            <ShoppingBag size={20} />
            {itemCount > 0 ? <b>{itemCount}</b> : null}
          </button>
          <ICMark />
        </div>
      </header>

      {search ? <SearchOverlay products={products} onClose={() => setSearch(false)} /> : null}
      <CartDrawer open={cartOpen} onOpenChange={setCartOpen} />
    </>
  )
}

export function ProductCard({ product }: { product: Product }) {
  const { addItem } = useCart()
  const toast = useToast()

  function handleAdd(event: React.MouseEvent) {
    event.preventDefault()
    event.stopPropagation()
    addItem(product, 1)
    toast.add({ title: 'Ajouté au panier', description: product.name, timeout: 3000 })
  }

  return (
    <article className="product-card">
      <Link href={`/boutique/${product.slug}`}>
        <div className="product-visual">
          <Image
            src={product.image}
            alt={product.name}
            width={480}
            height={480}
            sizes="(max-width: 1100px) 45vw, 400px"
            data-placeholder={isPlaceholderImage(product.image) ? '' : undefined}
            unoptimized={isPlaceholderImage(product.image)}
          />
        </div>
        <div className="product-meta">
          <span>{product.category === 'robot' ? 'Thermomix®' : 'Accessoires'}</span>
          <h3>{product.name}</h3>
          <p>Réf. {product.sku}</p>
          <strong>{formatPrice(product.priceTTC)}</strong>
        </div>
      </Link>
      <button className="add-button" onClick={handleAdd}>
        Ajouter au panier <ArrowRight size={16} />
      </button>
    </article>
  )
}

export function TrustStrip() {
  const items: [typeof ShieldCheck, string][] = [
    [ShieldCheck, 'Distributeur officiel Vorwerk'],
    [Truck, 'Livraison partout en Tunisie'],
    [ShieldCheck, '2 ans de garantie'],
    [Headphones, 'Service client local'],
  ]
  return (
    <div className="trust-strip">
      {items.map(([Icon, label]) => (
        <div key={label}>
          <Icon size={25} />
          <span>{label}</span>
        </div>
      ))}
    </div>
  )
}

/* Brand marks — Lucide dropped brand icons, so the official glyphs are inlined. */
function FacebookIcon({ size = 24 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M24 12.073C24 5.405 18.627 0 12 0S0 5.405 0 12.073C0 18.1 4.388 23.094 10.125 24v-8.437H7.078v-3.49h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.313 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.93-1.956 1.886v2.267h3.328l-.532 3.49h-2.796V24C19.612 23.094 24 18.1 24 12.073z" />
    </svg>
  )
}

function InstagramIcon({ size = 24 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z" />
    </svg>
  )
}

function YoutubeIcon({ size = 24 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M23.498 6.186a3.016 3.016 0 00-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 00.502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 002.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 002.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
    </svg>
  )
}

function TiktokIcon({ size = 24 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z" />
    </svg>
  )
}

export function Footer() {
  const socials = [
    { Icon: FacebookIcon, label: 'Facebook', href: 'https://www.facebook.com/ThermomixTunisie' },
    { Icon: InstagramIcon, label: 'Instagram', href: 'https://www.instagram.com/thermomix_tun/' },
    {
      Icon: YoutubeIcon,
      label: 'YouTube',
      href: 'https://www.youtube.com/channel/UCM_LGW18Muq5HfNWhHa5PKA',
    },
    { Icon: TiktokIcon, label: 'TikTok', href: 'https://www.tiktok.com/@thermomixtunisie' },
  ]

  const legalLinks = [
    { label: 'Confidentialité', href: 'https://tunisia.vorwerk-thermomix.com/privacy-policy/' },
    {
      label: 'Avertissement',
      href: 'https://tunisia.vorwerk-thermomix.com/thermomix-legal-disclaimer/',
    },
    { label: 'Qui sommes-nous', href: 'https://tunisia.vorwerk-thermomix.com/about-us/' },
    {
      label: 'Termes et conditions',
      href: 'https://tunisia.vorwerk-thermomix.com/terms-and-conditions/',
    },
  ]

  return (
    <footer>
      <div className="footer-main">
        <div>
          <div className="footer-brand">
            <BrandLockup dark />
            <ICMark />
          </div>
          <p>
            Depuis plus de 140 ans, nos produits convainquent des millions de familles grâce à leur
            technologie innovante et supérieure et à leur durée de vie proverbiale.
          </p>
          <h3>Contact</h3>
          <p>
            Vous avez des questions ?
            <br />
            Nous sommes là pour vous aider :
            <br />
            <a href="mailto:contact@inocasa.tn">Email: contact@inocasa.tn</a>
            <br />
            <a href="tel:+21622081414">Tél. : +216 22 08 14 14</a>
          </p>
        </div>

        <div className="footer-links">
          <BrandLockup dark />
          <a
            href="https://tunisia.vorwerk-thermomix.com/newsletter/"
            className="newsletter-link"
            target="_blank"
            rel="noopener noreferrer"
          >
            Inscrivez-vous à notre newsletter
          </a>
          <h3>Réseaux sociaux</h3>
          <div className="socials">
            {socials.map(({ Icon, label, href }) => (
              <a
                key={label}
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={label}
              >
                <Icon size={24} />
              </a>
            ))}
          </div>
        </div>
      </div>

      <div className="footer-bottom">
        <span>
          {legalLinks.map(({ label, href }) => (
            <a key={label} href={href} target="_blank" rel="noopener noreferrer">
              {label}
            </a>
          ))}
        </span>
        <small>© 2025 — 2026</small>
      </div>
    </footer>
  )
}
