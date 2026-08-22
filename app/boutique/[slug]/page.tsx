import { notFound } from 'next/navigation'
import { BoutiqueShell } from '@/components/boutique-shell'
import { ProductDetail } from '@/components/product-detail'
import { createClient } from '@/lib/supabase/server'
import { getProductBySlug, getProductsByCategory } from '@/lib/products'

export const revalidate = 300

export async function generateStaticParams() {
  const supabase = await createClient()
  const { data } = await supabase.from('products').select('slug')
  return (data ?? []).map((row) => ({ slug: row.slug as string }))
}

export default async function ProductPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const product = await getProductBySlug(slug)

  if (!product) {
    notFound()
  }

  const sameCategory = await getProductsByCategory(product.category)
  const related = sameCategory.filter((item) => item.slug !== product.slug).slice(0, 3)

  return (
    <BoutiqueShell>
      <ProductDetail product={product} related={related} />
    </BoutiqueShell>
  )
}
