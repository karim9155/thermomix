import { BoutiqueShell } from '@/components/boutique-shell'
import { BoutiqueCatalog } from '@/components/boutique-catalog'
import { getAllProducts } from '@/lib/products'

export const revalidate = 300

export default async function BoutiquePage() {
  const products = await getAllProducts()

  return (
    <BoutiqueShell>
      <section className="catalog">
        <BoutiqueCatalog products={products} />
      </section>
    </BoutiqueShell>
  )
}
