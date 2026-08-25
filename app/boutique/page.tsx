import { BoutiqueShell } from '@/components/boutique-shell'
import { BoutiqueCatalog } from '@/components/boutique-catalog'
import { HomeCarousel } from '@/components/home-carousel'
import { getAllProducts } from '@/lib/products'

export const revalidate = 300

export default async function BoutiquePage() {
  const products = await getAllProducts()

  return (
    <BoutiqueShell>
      <HomeCarousel />
      <section className="catalog">
        <div className="section-heading">
          <h2>Nos produits</h2>
        </div>
        <BoutiqueCatalog products={products} />
      </section>
    </BoutiqueShell>
  )
}
