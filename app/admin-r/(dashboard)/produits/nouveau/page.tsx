import { ProductForm } from '@/components/admin/product-form'
import { emptyProductFormValues } from '@/lib/admin/product-schema'

export const metadata = { title: 'Nouveau produit' }

export default function NewProductPage() {
  return (
    <div className="admin-page">
      <h1>Nouveau produit</h1>
      <ProductForm mode="create" initialValues={emptyProductFormValues} />
    </div>
  )
}
