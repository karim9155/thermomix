'use client'

import { useMemo, useState } from 'react'
import { ProductCard } from '@/components/boutique'
import type { Product, ProductCategory } from '@/lib/product-format'

type Filter = 'Tous' | 'Thermomix®' | 'Accessoires'

const FILTERS: Filter[] = ['Tous', 'Thermomix®', 'Accessoires']

function matchesFilter(category: ProductCategory, filter: Filter): boolean {
  if (filter === 'Tous') return true
  if (filter === 'Thermomix®') return category === 'robot'
  return category === 'accessoire'
}

export function BoutiqueCatalog({ products }: { products: Product[] }) {
  const [filter, setFilter] = useState<Filter>('Tous')
  const visible = useMemo(
    () => products.filter((product) => matchesFilter(product.category, filter)),
    [products, filter],
  )

  return (
    <>
      <div className="filter-row">
        {FILTERS.map((item) => (
          <button
            key={item}
            type="button"
            className={item === filter ? 'filter active' : 'filter'}
            onClick={() => setFilter(item)}
          >
            {item}
          </button>
        ))}
      </div>

      {visible.length === 0 ? (
        <p className="catalog-empty">Aucun produit dans cette catégorie pour le moment.</p>
      ) : (
        <div className="product-grid">
          {visible.map((product) => (
            <ProductCard key={product.slug} product={product} />
          ))}
        </div>
      )}
    </>
  )
}
