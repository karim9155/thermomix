import { NextRequest, NextResponse } from 'next/server'
import { createOrderSchema } from '@/lib/checkout-schema'
import { getProductsBySkus } from '@/lib/products'
import { createOrder, type OrderLine } from '@/lib/orders'
import { sendOrderEmails } from '@/lib/email'
import { getCustomer } from '@/lib/compte/guard'
import { TIMBRE_FISCAL } from '@/lib/product-format'

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

  // Fetched in one query rather than one per line. The loop below still
  // validates in cart order and returns on the first bad line, so the
  // error the customer sees is unchanged — only the round-trips are gone.
  const productsBySku = await getProductsBySkus(items.map((line) => line.sku))

  const lines: OrderLine[] = []
  for (const line of items) {
    const product = productsBySku.get(line.sku)
    if (!product || product.slug !== line.slug) {
      return NextResponse.json({ error: `Produit inconnu : ${line.sku}.` }, { status: 400 })
    }
    if (!product.inStock) {
      return NextResponse.json({ error: `${product.name} n'est plus en stock.` }, { status: 400 })
    }
    // Blocking only on inStock would let someone order 50 units when 3
    // remain. Stock is checked here, server-side, against the live row
    // rather than anything the client sent.
    if (line.quantity > product.stockQuantity) {
      return NextResponse.json(
        {
          error:
            product.stockQuantity === 1
              ? `Il ne reste qu'une unité de ${product.name}.`
              : `Il ne reste que ${product.stockQuantity} unités de ${product.name}.`,
        },
        { status: 400 },
      )
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
  // The fiscal stamp only applies to cash-on-delivery: it's the postal/COD
  // stamp duty, not a fee on the online card payment.
  const timbreFiscal = customer.paymentMethod === 'cash' ? TIMBRE_FISCAL : 0

  const order = await createOrder({
    customer,
    items: lines,
    subtotalHT,
    totalTVA,
    totalTTC,
    timbreFiscal,
    paymentMethod: customer.paymentMethod,
    userId: customerUser.id,
  })

  sendOrderEmails(order).catch((error) => {
    console.error('[commande] Échec inattendu de sendOrderEmails:', error)
  })

  // Cash on delivery is the only payment method that ships today, so every
  // order lands straight on the confirmation page. The online-payment
  // branch that used to live here is gone along with lib/payment.ts and the
  // provider webhook — it was unreachable anyway, because checkoutFormSchema
  // rejects paymentMethod: 'online' before this point. When card payment is
  // built, this is where the redirect to the provider goes.
  return NextResponse.json({
    reference: order.reference,
    redirectTo: `/commande/confirmation?ref=${order.reference}`,
  })
}
