'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import { ExternalLink, Pencil } from 'lucide-react'
import type { AdminProductListItem } from '@/lib/admin/products'
import { setArchivedAction } from '@/app/admin-r/(dashboard)/produits/actions'
import { formatPrice, isPlaceholderImage } from '@/lib/product-format'

const CATEGORY_LABELS: Record<string, string> = {
  robot: 'Thermomix® TM7',
  accessoire: 'Accessoire',
}

function ArchiveButton({ product }: { product: AdminProductListItem }) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()

  function toggle() {
    startTransition(async () => {
      await setArchivedAction(product.sku, product.slug, !product.isArchived)
      router.refresh()
    })
  }

  return (
    <button type="button" className="admin-table-link" onClick={toggle} disabled={pending}>
      {pending ? '…' : product.isArchived ? 'Désarchiver' : 'Archiver'}
    </button>
  )
}

export function ProduitsTable({ products }: { products: AdminProductListItem[] }) {
  const [query, setQuery] = useState('')
  const term = query.trim().toLowerCase()
  const visible = term
    ? products.filter(
        (p) => p.name.toLowerCase().includes(term) || p.sku.toLowerCase().includes(term),
      )
    : products

  return (
    <div>
      <div className="admin-search admin-search-standalone">
        <input
          placeholder="Rechercher par nom ou Réf."
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
      </div>

      <table className="admin-table">
        <thead>
          <tr>
            <th />
            <th>Réf.</th>
            <th>Nom</th>
            <th>Catégorie</th>
            <th>Prix TTC</th>
            <th>Stock</th>
            <th>Images</th>
            <th>Statut</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {visible.map((product) => (
            <tr key={product.sku} className={product.isArchived ? 'admin-row-muted' : ''}>
              <td>
                <div className="admin-thumb">
                  <Image
                    src={product.heroImage ?? '/placeholder.svg'}
                    alt={product.name}
                    width={64}
                    height={64}
                    unoptimized={isPlaceholderImage(product.heroImage ?? '/placeholder.svg')}
                  />
                </div>
              </td>
              <td>{product.sku}</td>
              <td>{product.name}</td>
              <td>{CATEGORY_LABELS[product.category]}</td>
              <td>{formatPrice(product.priceTTC)}</td>
              <td>
                <span className={`admin-badge ${product.inStock ? 'badge-green' : 'badge-red'}`}>
                  {product.inStock ? 'En stock' : 'Rupture'}
                </span>
              </td>
              <td>{product.imageCount}</td>
              <td>
                {product.isArchived ? (
                  <span className="admin-badge badge-gray">Archivé</span>
                ) : (
                  <span className="admin-badge badge-green">Actif</span>
                )}
              </td>
              <td>
                <div className="admin-row-actions">
                  <a
                    href={`/boutique/${product.slug}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="admin-table-link"
                  >
                    <ExternalLink size={14} /> Voir
                  </a>
                  <Link href={`/admin-r/produits/${product.sku}`} className="admin-table-link">
                    <Pencil size={14} /> Modifier
                  </Link>
                  <ArchiveButton product={product} />
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
