import Link from 'next/link'
import { FileText } from 'lucide-react'
import { requireAdvisorPage } from '@/lib/conseiller/guard'
import { listSales } from '@/lib/conseiller/sales'
import { SALE_STATUSES } from '@/lib/conseiller/format'
import { SalesTable } from '@/components/conseiller/sales-table'

export const metadata = { title: 'Mes ventes' }

export default async function MesVentesPage() {
  const advisor = await requireAdvisorPage()
  const sales = await listSales({ advisorId: advisor.id })

  return (
    <div className="admin-page">
      <div className="admin-section-heading">
        <h1>Mes ventes</h1>
        <Link href="/conseiller/ventes/nouveau" className="primary-button">
          <FileText size={17} /> Nouveau bon de commande
        </Link>
      </div>
      <SalesTable sales={sales} hrefBase="/conseiller/ventes" statuses={[...SALE_STATUSES]} />
    </div>
  )
}
