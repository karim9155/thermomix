import Link from 'next/link'
import { Plus } from 'lucide-react'
import { listProductsAdmin } from '@/lib/admin/products'
import { ProduitsTable } from '@/components/admin/produits-table'

export const metadata = { title: 'Produits' }

export default async function ProduitsPage() {
  const products = await listProductsAdmin()

  return (
    <div className="admin-page">
      <div className="admin-section-heading">
        <h1>Produits</h1>
        <Link href="/admin-r/produits/nouveau" className="primary-button">
          <Plus size={17} /> Nouveau produit
        </Link>
      </div>
      <ProduitsTable products={products} />
    </div>
  )
}
