import { notFound } from 'next/navigation'
import { getProductAdminBySku } from '@/lib/admin/products'
import { ProductForm } from '@/components/admin/product-form'
import type { ProductFormValues } from '@/lib/admin/product-schema'

export async function generateMetadata({ params }: { params: Promise<{ sku: string }> }) {
  const { sku } = await params
  return { title: `Modifier ${sku}` }
}

export default async function EditProductPage({ params }: { params: Promise<{ sku: string }> }) {
  const { sku } = await params
  const product = await getProductAdminBySku(sku)

  if (!product) {
    notFound()
  }

  const initialValues: ProductFormValues = {
    sku: product.sku,
    slug: product.slug,
    name: product.name,
    category: product.category,
    priceHT: product.priceHT,
    tva: product.tva,
    priceTTC: product.priceTTC,
    shortDescription: product.shortDescription,
    description: product.description,
    features:
      product.features.length > 0 ? product.features.map((v) => ({ value: v })) : [{ value: '' }],
    included: product.included.map((v) => ({ value: v })),
    sourceUrl: product.sourceUrl,
    inStock: product.inStock,
    isFeatured: product.isFeatured,
    sortOrder: product.sortOrder,
  }

  return (
    <div className="admin-page">
      <h1>{product.name}</h1>
      <ProductForm
        mode="edit"
        initialValues={initialValues}
        productId={product.id}
        images={product.images}
      />
    </div>
  )
}
