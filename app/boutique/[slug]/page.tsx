import { notFound } from 'next/navigation'
import { BoutiqueShell } from '@/components/boutique-shell'
import { ProductDetail } from '@/components/product-detail'
import { createClient } from '@/lib/supabase/server'
import { getAllProducts } from '@/lib/products'

export const revalidate = 300

export async function generateStaticParams() {
  const supabase = await createClient()
  const { data } = await supabase.from('products').select('slug')
  return (data ?? []).map((row) => ({ slug: row.slug as string }))
}

export default async function ProductPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params

  // One catalog read serves all three needs: this product, its related
  // items, and the header's search in BoutiqueShell below. It used to be
  // getProductBySlug + getProductsByCategory + the shell's own
  // getAllProducts — three sequential round-trips for a catalog small
  // enough to arrive in one. getAllProducts is cache()d per request, so
  // the shell reuses this exact fetch rather than repeating it.
  const products = await getAllProducts()
  const product = products.find((item) => item.slug === slug)

  if (!product) {
    notFound()
  }

  const related = products
    .filter((item) => item.category === product.category && item.slug !== product.slug)
    .slice(0, 3)

  return (
    <BoutiqueShell>
      <ProductDetail product={product} related={related} />
    </BoutiqueShell>
  )
}
