import { NextRequest, NextResponse } from 'next/server'
import { createOrderSchema } from '@/lib/checkout-schema'
import { getProductBySku } from '@/lib/products'
import { createOrder, type OrderLine } from '@/lib/orders'
import { createPayment } from '@/lib/payment'
import { sendOrderEmails } from '@/lib/email'
import { getCustomer } from '@/lib/compte/guard'

export async function POST(request: NextRequest) {
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Requête invalide.' }, { status: 400 })
  }

  // An account is required to order. This is the enforcement point, not
  // the checkout page's redirect — the page can be bypassed by posting
  // here directly, so ownership is established from the session cookie
  // and never from anything the client sends.
  const customerUser = await getCustomer()
  if (!customerUser) {
    return NextResponse.json(
      { error: 'Vous devez être connecté pour passer commande.', requiresAuth: true },
      { status: 401 },
    )
  }

  const parsed = createOrderSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Données de commande invalides.', issues: parsed.error.issues },
      { status: 400 },
    )
  }

  const { customer, items } = parsed.data

  const lines: OrderLine[] = []
  for (const line of items) {
    const product = await getProductBySku(line.sku)
    if (!product || product.slug !== line.slug) {
      return NextResponse.json({ error: `Produit inconnu : ${line.sku}.` }, { status: 400 })
    }
    if (!product.inStock) {
      return NextResponse.json({ error: `${product.name} n'est plus en stock.` }, { status: 400 })
    }
    lines.push({
      sku: product.sku,
      name: product.name,
      quantity: line.quantity,
      priceHT: product.priceHT,
      priceTTC: product.priceTTC,
    })
  }

  const subtotalHT = lines.reduce((sum, line) => sum + line.priceHT * line.quantity, 0)
  const totalTTC = lines.reduce((sum, line) => sum + line.priceTTC * line.quantity, 0)
  const totalTVA = totalTTC - subtotalHT

  const order = await createOrder({
    customer,
    items: lines,
    subtotalHT,
    totalTVA,
    totalTTC,
    paymentMethod: customer.paymentMethod,
    userId: customerUser.id,
  })

  sendOrderEmails(order).catch((error) => {
    console.error('[commande] Échec inattendu de sendOrderEmails:', error)
  })

  if (customer.paymentMethod === 'cash') {
    return NextResponse.json({
      reference: order.reference,
      redirectTo: `/commande/confirmation?ref=${order.reference}`,
    })
  }

  try {
    const { paymentUrl } = await createPayment({
      amount: order.totalTTC,
      reference: order.reference,
      customer: {
        nom: customer.nom,
        prenom: customer.prenom,
        email: customer.email,
        telephone: customer.telephone,
      },
    })
    return NextResponse.json({ reference: order.reference, paymentUrl })
  } catch (error) {
    console.error('[commande] Échec de création du paiement:', error)
    return NextResponse.json(
      {
        error: 'Impossible de démarrer le paiement en ligne pour le moment.',
        reference: order.reference,
      },
      { status: 502 },
    )
  }
}
