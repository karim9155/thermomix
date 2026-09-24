import { formatPrice, formatPriceHT } from '@/lib/product-format'
import {
  INSTALLMENT_PAYMENT_LABELS,
  dateFormatter,
  type Installment,
  type SaleDetail,
} from '@/lib/conseiller/format'
import { LateBadge } from '@/components/conseiller/badges'

// Presentational pieces of an order form, shared by the admin page and
// the advisor's page. Server Components: no state, no handlers.

function formatDay(isoDate: string): string {
  // A due date is a calendar day, not an instant: parse it at noon UTC so
  // no timezone can push it onto the previous day.
  return dateFormatter.format(new Date(`${isoDate}T12:00:00Z`))
}

export { formatDay }

export function SaleLinesTable({ sale }: { sale: SaleDetail }) {
  return (
    <>
      <div className="admin-table-scroll">
        <table className="admin-table">
          <thead>
            <tr>
              <th>Produit</th>
              <th>Réf.</th>
              <th>Qté</th>
              <th>Prix TTC</th>
              <th>Total TTC</th>
            </tr>
          </thead>
          <tbody>
            {sale.items.map((item) => (
              <tr key={item.sku}>
                <td>{item.name}</td>
                <td>{item.sku}</td>
                <td>{item.quantity}</td>
                <td>{formatPrice(item.priceTTC)}</td>
                <td>{formatPrice(item.priceTTC * item.quantity)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="admin-totals">
        <div>
          <span>Sous-total HT</span>
          <strong>{formatPriceHT(sale.subtotalHT)}</strong>
        </div>
        <div>
          <span>TVA</span>
          <strong>{formatPrice(sale.totalTVA)}</strong>
        </div>
        <div>
          <span>Total produits TTC</span>
          <strong>{formatPrice(sale.totalTTC)}</strong>
        </div>
        {sale.deliveryFee > 0 ? (
          <div>
            <span>Frais de livraison</span>
            <strong>{formatPrice(sale.deliveryFee)}</strong>
          </div>
        ) : null}
        {sale.timbreFiscal > 0 ? (
          <div>
            <span>Timbre fiscal</span>
            <strong>{formatPrice(sale.timbreFiscal)}</strong>
          </div>
        ) : null}
        <div className="admin-totals-final">
          <span>Total à payer</span>
          <strong>{formatPrice(sale.totalDue)}</strong>
        </div>
      </div>
    </>
  )
}

/** Read-only schedule (D8): what's due when, what's paid, what's left. */
export function ScheduleTable({
  installments,
  totalDue,
  paidAmount,
}: {
  installments: Installment[]
  totalDue: number
  paidAmount: number
}) {
  if (installments.length === 0) {
    return <p className="admin-empty">L&apos;échéancier sera généré à la facturation.</p>
  }

  return (
    <>
      <div className="admin-table-scroll">
        <table className="admin-table">
          <thead>
            <tr>
              <th>Tranche</th>
              <th>Échéance</th>
              <th>Montant</th>
              <th>Statut</th>
            </tr>
          </thead>
          <tbody>
            {installments.map((entry) => (
              <tr key={entry.id}>
                <td>{entry.number}</td>
                <td>{formatDay(entry.dueDate)}</td>
                <td>{formatPriceHT(entry.amount)}</td>
                <td>
                  <InstallmentStatus entry={entry} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <RemainingSummary totalDue={totalDue} paidAmount={paidAmount} />
    </>
  )
}

export function InstallmentStatus({ entry }: { entry: Installment }) {
  if (entry.paidAt) {
    return (
      <span className="admin-payment-cell">
        <span className="admin-badge badge-green">Payée le {formatDay(entry.paidAt)}</span>
        {entry.paymentMethod ? <span>{INSTALLMENT_PAYMENT_LABELS[entry.paymentMethod]}</span> : null}
      </span>
    )
  }
  if (entry.isLate) return <LateBadge />
  return <span className="admin-badge badge-gray">À venir</span>
}

export function RemainingSummary({ totalDue, paidAmount }: { totalDue: number; paidAmount: number }) {
  return (
    <div className="admin-totals">
      <div>
        <span>Encaissé</span>
        <strong>{formatPriceHT(paidAmount)}</strong>
      </div>
      <div className="admin-totals-final">
        <span>Reste à payer</span>
        <strong>{formatPriceHT(Math.max(0, totalDue - paidAmount))}</strong>
      </div>
    </div>
  )
}
