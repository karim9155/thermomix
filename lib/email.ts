import 'server-only'
import { Resend } from 'resend'
import { formatPrice, formatPriceHT } from '@/lib/product-format'
import type { Order } from '@/lib/orders'

/**
 * Order emails, sent through Resend.
 *
 * Two different messages go out, and they are deliberately not the same
 * text: the customer gets a confirmation with a link to track the order,
 * the shop gets an internal notification with the details needed to fulfil
 * it and a direct link to the order in the admin. Sending one body to
 * both, as this module used to, meant customers received what read like an
 * internal notice.
 */

const STORE_EMAIL = process.env.ORDER_NOTIFICATION_EMAIL ?? 'contact@inocasa.tn'

function getSiteUrl(): string {
  return process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'
}

/**
 * Order data is customer-supplied and lands in an HTML email, so every
 * interpolated value is escaped. Without this a name containing a tag
 * would break the markup — or worse, in a mail client that renders it.
 */
function esc(value: string | null | undefined): string {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function itemRows(order: Order): string {
  return order.items
    .map(
      (item) => `
      <tr>
        <td style="padding:10px 12px;border-bottom:1px solid #e5e7eb">
          ${esc(item.name)}<br />
          <span style="color:#6b7280;font-size:12px">Réf. ${esc(item.sku)}</span>
        </td>
        <td style="padding:10px 12px;border-bottom:1px solid #e5e7eb;text-align:right">${item.quantity}</td>
        <td style="padding:10px 12px;border-bottom:1px solid #e5e7eb;text-align:right">${formatPriceHT(item.priceHT)}</td>
        <td style="padding:10px 12px;border-bottom:1px solid #e5e7eb;text-align:right">${formatPriceHT(item.priceHT * item.quantity)}</td>
      </tr>`,
    )
    .join('')
}

function totalsBlock(order: Order): string {
  const stamp =
    order.timbreFiscal > 0
      ? `<tr><td style="padding:4px 0;color:#6b7280">Timbre fiscal</td><td style="padding:4px 0;text-align:right">${formatPrice(order.timbreFiscal)}</td></tr>`
      : ''

  // Home delivery only — omitted entirely for store pickup.
  const shipping =
    order.deliveryFee > 0
      ? `<tr><td style="padding:4px 0;color:#6b7280">Frais de livraison</td><td style="padding:4px 0;text-align:right">${formatPrice(order.deliveryFee)}</td></tr>`
      : ''

  return `
    <table style="width:100%;max-width:320px;margin-left:auto;font-size:14px;border-collapse:collapse">
      <tr><td style="padding:4px 0;color:#6b7280">Sous-total HT</td><td style="padding:4px 0;text-align:right">${formatPriceHT(order.subtotalHT)}</td></tr>
      <tr><td style="padding:4px 0;color:#6b7280">TVA 19%</td><td style="padding:4px 0;text-align:right">${formatPrice(order.totalTVA)}</td></tr>
      ${shipping}
      ${stamp}
      <tr>
        <td style="padding:10px 0 0;border-top:1px solid #1f2328;font-weight:bold">Total TTC à payer</td>
        <td style="padding:10px 0 0;border-top:1px solid #1f2328;text-align:right;font-weight:bold">
          ${formatPrice(order.totalTTC + order.timbreFiscal + order.deliveryFee)}
        </td>
      </tr>
    </table>`
}

function shell(inner: string): string {
  return `<div style="font-family:Helvetica,Arial,sans-serif;color:#1f2328;max-width:600px;margin:0 auto;padding:28px">${inner}</div>`
}

function tableHead(): string {
  return `
    <table style="width:100%;border-collapse:collapse;font-size:14px;margin:18px 0">
      <thead>
        <tr>
          <th style="text-align:left;padding:8px 12px;font-size:11px;color:#6b7280;text-transform:uppercase;border-bottom:2px solid #1f2328">Produit</th>
          <th style="text-align:right;padding:8px 12px;font-size:11px;color:#6b7280;text-transform:uppercase;border-bottom:2px solid #1f2328">Qté</th>
          <th style="text-align:right;padding:8px 12px;font-size:11px;color:#6b7280;text-transform:uppercase;border-bottom:2px solid #1f2328">Prix HT</th>
          <th style="text-align:right;padding:8px 12px;font-size:11px;color:#6b7280;text-transform:uppercase;border-bottom:2px solid #1f2328">Total</th>
        </tr>
      </thead>`
}

/** What the customer receives: a confirmation, not an internal notice. */
function renderCustomerHtml(order: Order): string {
  const paymentLabel =
    order.paymentMethod === 'cash' ? 'Paiement à la livraison' : 'Paiement en ligne'
  const deliveryLabel =
    order.customer.deliveryMethod === 'boutique'
      ? 'Récupération en boutique'
      : 'Livraison à domicile'
  const addressLabel = order.customer.deliveryMethod === 'boutique' ? 'Adresse de retrait' : 'Adresse'

  return shell(`
    <h1 style="font-size:22px;margin:0 0 6px">Merci pour votre commande</h1>
    <p style="color:#6b7280;font-size:14px;margin:0 0 22px">
      Votre commande <strong style="color:#1f2328">${esc(order.reference)}</strong> a bien été
      enregistrée. Nous vous contacterons pour confirmer la livraison.
    </p>

    ${tableHead()}
      <tbody>${itemRows(order)}</tbody>
    </table>

    ${totalsBlock(order)}

    <p style="font-size:14px;margin:22px 0 6px"><strong>Mode de paiement :</strong> ${paymentLabel}</p>
    <p style="font-size:14px;margin:0 0 6px"><strong>Mode de livraison :</strong> ${deliveryLabel}</p>
    <p style="font-size:14px;margin:0 0 22px">
      <strong>${addressLabel} :</strong> ${esc(order.customer.adresse)}, ${esc(order.customer.ville)},
      ${esc(order.customer.gouvernorat)}
    </p>

    <p style="margin:28px 0">
      <a href="${getSiteUrl()}/compte"
         style="background:#009A3D;color:#fff;padding:13px 22px;border-radius:999px;text-decoration:none;font-weight:bold;display:inline-block">
        Suivre ma commande
      </a>
    </p>

    <p style="color:#6b7280;font-size:12px;line-height:1.6;border-top:1px solid #e5e7eb;padding-top:16px">
      INOCASA — Distributeur officiel Vorwerk Thermomix® en Tunisie<br />
      Avenue du Stade, La Marsa 2070 · ${STORE_EMAIL} · +216 22 08 14 14
    </p>
  `)
}

/** What the shop receives: everything needed to act on the order. */
function renderAdminHtml(order: Order): string {
  const paymentLabel =
    order.paymentMethod === 'cash' ? 'Paiement à la livraison' : 'Paiement en ligne'
  const deliveryLabel =
    order.customer.deliveryMethod === 'boutique'
      ? 'Récupération en boutique'
      : 'Livraison à domicile'
  const addressLabel = order.customer.deliveryMethod === 'boutique' ? 'Retrait' : 'Adresse'
  const adminUrl = `${getSiteUrl()}/admin-r/livraisons/${order.reference}`

  return shell(`
    <p style="font-size:11px;letter-spacing:1px;text-transform:uppercase;color:#009A3D;margin:0 0 4px">
      Nouvelle commande
    </p>
    <h1 style="font-size:22px;margin:0 0 22px">${esc(order.reference)}</h1>

    <p style="margin:0 0 28px">
      <a href="${adminUrl}"
         style="background:#009A3D;color:#fff;padding:13px 22px;border-radius:999px;text-decoration:none;font-weight:bold;display:inline-block">
        Ouvrir dans l&apos;administration
      </a>
    </p>

    <table style="width:100%;font-size:14px;border-collapse:collapse;margin-bottom:8px">
      <tr><td style="padding:4px 0;color:#6b7280;width:120px">Client</td><td style="padding:4px 0">${esc(order.customer.prenom)} ${esc(order.customer.nom)}</td></tr>
      <tr><td style="padding:4px 0;color:#6b7280">Téléphone</td><td style="padding:4px 0"><a href="tel:${esc(order.customer.telephone)}">${esc(order.customer.telephone)}</a></td></tr>
      ${order.customer.email ? `<tr><td style="padding:4px 0;color:#6b7280">Email</td><td style="padding:4px 0">${esc(order.customer.email)}</td></tr>` : ''}
      <tr><td style="padding:4px 0;color:#6b7280">Livraison</td><td style="padding:4px 0">${deliveryLabel}</td></tr>
      <tr><td style="padding:4px 0;color:#6b7280">${addressLabel}</td><td style="padding:4px 0">${esc(order.customer.adresse)}, ${esc(order.customer.ville)}, ${esc(order.customer.gouvernorat)}</td></tr>
      <tr><td style="padding:4px 0;color:#6b7280">Paiement</td><td style="padding:4px 0">${paymentLabel}</td></tr>
      ${order.customer.notes ? `<tr><td style="padding:4px 0;color:#6b7280">Notes</td><td style="padding:4px 0">${esc(order.customer.notes)}</td></tr>` : ''}
    </table>

    ${tableHead()}
      <tbody>${itemRows(order)}</tbody>
    </table>

    ${totalsBlock(order)}
  `)
}

/**
 * The verified sender on the Resend account. Resend only accepts a From
 * address on a domain verified there, so this must stay on inocasa.tn —
 * pointing it elsewhere makes every send fail with a 403.
 */
const FROM = process.env.RESEND_FROM_EMAIL ?? 'INOCASA <commandes@inocasa.tn>'

function getResend(): Resend | null {
  const apiKey = process.env.RESEND_API_KEY

  if (!apiKey) return null

  return new Resend(apiKey)
}

export async function sendOrderEmails(order: Order): Promise<void> {
  const resend = getResend()

  if (!resend) {
    console.log(
      `[email] RESEND_API_KEY absente — email non envoyé pour la commande ${order.reference}.`,
    )
    return
  }

  // Each send is awaited separately so one failure cannot swallow the
  // other — a customer confirmation that bounces must not cost the shop
  // its notification, or vice versa. Neither ever throws: the order is
  // already committed, and failing the request over an email would tell
  // the customer their purchase failed when it did not.
  //
  // Resend reports failures in the resolved `error` rather than by
  // throwing, so both have to be checked or a rejected send looks like a
  // success.
  try {
    const { error } = await resend.emails.send({
      from: FROM,
      to: STORE_EMAIL,
      replyTo: order.customer.email || undefined,
      subject: `Nouvelle commande ${order.reference} — ${order.customer.prenom} ${order.customer.nom}`,
      html: renderAdminHtml(order),
    })

    if (error) {
      console.error(`[email] Notification boutique refusée (${order.reference}):`, error)
    }
  } catch (error) {
    console.error(`[email] Notification boutique échouée (${order.reference}):`, error)
  }

  if (!order.customer.email) return

  try {
    const { error } = await resend.emails.send({
      from: FROM,
      to: order.customer.email,
      replyTo: STORE_EMAIL,
      subject: `Votre commande INOCASA ${order.reference}`,
      html: renderCustomerHtml(order),
    })

    if (error) {
      console.error(`[email] Confirmation client refusée (${order.reference}):`, error)
    }
  } catch (error) {
    console.error(`[email] Confirmation client échouée (${order.reference}):`, error)
  }
}
