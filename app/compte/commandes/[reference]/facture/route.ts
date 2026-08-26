import { NextResponse } from 'next/server'
import { getCustomer } from '@/lib/compte/guard'
import { getCustomerOrder } from '@/lib/compte/orders'
import { createAdminClient } from '@/lib/supabase/admin'

const INVOICE_BUCKET = 'order-invoices'

/**
 * Invoice PDF for one order, uploaded by the admin (see the "Facture" card
 * on the order's admin page) and streamed back as-is.
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
 *   3. Only a delivered order has an invoice — and delivery cannot be set
 *      without one uploaded first (see lib/admin/orders.ts).
 *
 * The bucket is private, so the file is fetched with the service-role
 * client — the customer's own session has no storage policy on it.
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

  if (!order.invoicePath) {
    return NextResponse.json(
      { error: "La facture n'est pas encore disponible pour cette commande." },
      { status: 409 },
    )
  }

  const supabase = createAdminClient()
  const { data: blob, error: downloadError } = await supabase.storage
    .from(INVOICE_BUCKET)
    .download(order.invoicePath)

  if (downloadError || !blob) {
    return NextResponse.json({ error: 'Impossible de charger la facture.' }, { status: 500 })
  }

  const pdf = Buffer.from(await blob.arrayBuffer())

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
