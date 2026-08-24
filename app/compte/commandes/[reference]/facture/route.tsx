import { NextResponse } from 'next/server'
import { renderToBuffer } from '@react-pdf/renderer'
import { getCustomer } from '@/lib/compte/guard'
import { getCustomerOrder } from '@/lib/compte/orders'
import { InvoiceDocument } from '@/lib/compte/invoice'

/**
 * Invoice PDF for one order, generated server-side.
 *
 * Every guard here is re-applied on the server and none of them trust the
 * URL: the reference in the path only ever selects a row, it never proves
 * anything. Without this, anyone could walk references and pull other
 * people's invoices.
 *
 *   1. There must be a session.
 *   2. getCustomerOrder() reads through the customer's own session client,
 *      so RLS returns the row only if order.user_id = auth.uid(). A
 *      reference belonging to someone else comes back undefined, exactly
 *      like one that doesn't exist, and both 404.
 *   3. Only a delivered order has an invoice.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ reference: string }> },
) {
  const { reference } = await params

  const customer = await getCustomer()
  if (!customer) {
    return NextResponse.json({ error: 'Non authentifié.' }, { status: 401 })
  }

  const order = await getCustomerOrder(reference)
  if (!order) {
    return NextResponse.json({ error: 'Commande introuvable.' }, { status: 404 })
  }

  if (order.deliveryStatus !== 'livree') {
    return NextResponse.json(
      { error: "La facture sera disponible une fois la commande livrée." },
      { status: 409 },
    )
  }

  const pdf = await renderToBuffer(<InvoiceDocument order={order} />)

  return new NextResponse(pdf as unknown as BodyInit, {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="facture-${order.reference}.pdf"`,
      // An invoice is per-customer and behind auth — never let a shared
      // cache hold on to it.
      'Cache-Control': 'private, no-store',
    },
  })
}
