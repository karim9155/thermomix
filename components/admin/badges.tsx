// Types come from the client-safe module, not lib/admin/orders, so these
// presentational badges can be reused in the customer area (/compte)
// without pulling the service-role client anywhere near it.
import type { DeliveryStatus, PaymentMethod, PaymentStatus } from '@/lib/admin/order-format'

const DELIVERY_LABELS: Record<DeliveryStatus, string> = {
  en_preparation: 'En préparation',
  en_cours_de_livraison: 'En cours de livraison',
  livree: 'Livrée',
  annulee: 'Annulée',
}

const DELIVERY_CLASS: Record<DeliveryStatus, string> = {
  en_preparation: 'badge-gray',
  en_cours_de_livraison: 'badge-amber',
  livree: 'badge-green',
  annulee: 'badge-red',
}

export function DeliveryStatusBadge({ status }: { status: DeliveryStatus }) {
  return <span className={`admin-badge ${DELIVERY_CLASS[status]}`}>{DELIVERY_LABELS[status]}</span>
}

const PAYMENT_STATUS_LABELS: Record<PaymentStatus, string> = {
  en_attente: 'En attente',
  payee: 'Payée',
  annulee: 'Annulée',
}

const PAYMENT_STATUS_CLASS: Record<PaymentStatus, string> = {
  en_attente: 'badge-gray',
  payee: 'badge-green',
  annulee: 'badge-red',
}

export function PaymentStatusBadge({ status }: { status: PaymentStatus }) {
  return (
    <span className={`admin-badge ${PAYMENT_STATUS_CLASS[status]}`}>
      {PAYMENT_STATUS_LABELS[status]}
    </span>
  )
}

const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  livraison: 'À la livraison',
  en_ligne: 'En ligne',
}

export function paymentMethodLabel(method: PaymentMethod): string {
  return PAYMENT_METHOD_LABELS[method]
}
