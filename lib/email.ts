import { Resend } from 'resend'
import { formatPrice } from '@/lib/product-format'
import type { Order } from '@/lib/orders'

const STORE_EMAIL = 'contact@inocasa.tn'

function renderOrderHtml(order: Order): string {
  const rows = order.items
    .map(
      (item) =>
        `<tr><td>${item.name} (Réf. ${item.sku})</td><td>${item.quantity}</td><td>${formatPrice(item.priceTTC)}</td><td>${formatPrice(item.priceTTC * item.quantity)}</td></tr>`,
    )
    .join('')

  const paymentLabel =
    order.paymentMethod === 'cash' ? 'Paiement à la livraison' : 'Paiement en ligne'
  const deliveryLabel =
    order.customer.deliveryMethod === 'boutique'
      ? 'Récupération en boutique'
      : 'Livraison à domicile'
  const addressLabel = order.customer.deliveryMethod === 'boutique' ? 'Adresse de retrait' : 'Adresse'

  return `
    <h2>Commande ${order.reference}</h2>
    <p><strong>Client :</strong> ${order.customer.prenom} ${order.customer.nom}</p>
    <p><strong>Téléphone :</strong> ${order.customer.telephone}</p>
    ${order.customer.email ? `<p><strong>Email :</strong> ${order.customer.email}</p>` : ''}
    <p><strong>Mode de livraison :</strong> ${deliveryLabel}</p>
    <p><strong>${addressLabel} :</strong> ${order.customer.adresse}, ${order.customer.ville}, ${order.customer.gouvernorat}</p>
    ${order.customer.notes ? `<p><strong>Notes :</strong> ${order.customer.notes}</p>` : ''}
    <p><strong>Mode de paiement :</strong> ${paymentLabel}</p>
    <table border="1" cellpadding="8" cellspacing="0">
      <thead><tr><th>Produit</th><th>Qté</th><th>Prix TTC</th><th>Total</th></tr></thead>
      <tbody>${rows}</tbody>
    </table>
    <p>Sous-total HT : ${formatPrice(order.subtotalHT)}<br/>
    TVA (19%) : ${formatPrice(order.totalTVA)}<br/>
    Total TTC : ${formatPrice(order.totalTTC)}<br/>
    ${order.timbreFiscal > 0 ? `Timbre fiscal : ${formatPrice(order.timbreFiscal)}<br/>` : ''}
    <strong>Total à payer : ${formatPrice(order.totalTTC + order.timbreFiscal)}</strong></p>
  `
}

export async function sendOrderEmails(order: Order): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY

  if (!apiKey) {
    console.log(
      `[email] RESEND_API_KEY absente — email non envoyé pour la commande ${order.reference}.`,
    )
    return
  }

  try {
    const resend = new Resend(apiKey)
    const html = renderOrderHtml(order)

    await resend.emails.send({
      from: 'INOCASA <commandes@inocasa.tn>',
      to: STORE_EMAIL,
      subject: `Nouvelle commande ${order.reference}`,
      html,
    })

    if (order.customer.email) {
      await resend.emails.send({
        from: 'INOCASA <commandes@inocasa.tn>',
        to: order.customer.email,
        subject: `Votre commande INOCASA ${order.reference}`,
        html,
      })
    }
  } catch (error) {
    console.error(`[email] Échec de l'envoi pour la commande ${order.reference}:`, error)
  }
}
