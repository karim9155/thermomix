import { Header, Footer } from '@/components/boutique'
import { getAllProducts } from '@/lib/products'

export async function BoutiqueShell({ children }: { children: React.ReactNode }) {
  const products = await getAllProducts()

  return (
    <>
      <Header products={products} />
      <main>{children}</main>
      <Footer />
    </>
  )
}
