import { listSales } from '@/lib/conseiller/sales'
import { SalesTable } from '@/components/conseiller/sales-table'

export const metadata = { title: 'Bons de commande' }

export default async function BonsDeCommandePage() {
  // Drafts are the advisor's private work and never listed here.
  const sales = await listSales()
  const toInvoice = sales.filter((sale) => sale.saleStatus === 'a_facturer').length

  return (
    <div className="admin-page">
      <h1>Bons de commande</h1>
      {toInvoice > 0 ? (
        <p className="advisor-help admin-muted">
          {toInvoice} bon{toInvoice > 1 ? 's' : ''} en attente de validation.
        </p>
      ) : null}
      <SalesTable
        sales={sales}
        hrefBase="/admin-r/bons-de-commande"
        statuses={['a_facturer', 'facture', 'partiellement_paye', 'paye', 'annule']}
        showAdvisor
      />
    </div>
  )
}
