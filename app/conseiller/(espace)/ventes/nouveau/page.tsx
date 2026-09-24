import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { requireAdvisorPage } from '@/lib/conseiller/guard'
import { listClients } from '@/lib/conseiller/clients'
import { getAllProducts } from '@/lib/products'
import { OrderFormEditor } from '@/components/conseiller/order-form-editor'
import { toEditorClients, toEditorProducts } from '@/lib/conseiller/editor-data'

export const metadata = { title: 'Nouveau bon de commande' }

export default async function NouveauBonPage({
  searchParams,
}: {
  searchParams: Promise<{ client?: string }>
}) {
  const advisor = await requireAdvisorPage()
  const [{ client }, clients, products] = await Promise.all([
    searchParams,
    listClients({ advisorId: advisor.id }),
    getAllProducts(),
  ])

  // Only preselect a client that is actually this advisor's.
  const preselected = clients.some((entry) => entry.id === client) ? client! : ''

  return (
    <div className="admin-page">
      <Link href="/conseiller/ventes" className="back-link">
        <ArrowLeft size={16} /> Retour à mes ventes
      </Link>
      <h1>Nouveau bon de commande</h1>
      <OrderFormEditor
        reference={null}
        products={toEditorProducts(products)}
        clients={toEditorClients(clients)}
        initial={{
          clientId: preselected,
          items: [],
          deliveryMethod: 'domicile',
          installmentCount: 1,
          notes: '',
        }}
      />
    </div>
  )
}
