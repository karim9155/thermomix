import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin/guard'
import { createAdminClient } from '@/lib/supabase/admin'

const INVOICE_BUCKET = 'order-invoices'

/**
 * Streams the admin-uploaded invoice PDF for one order, for the admin to
 * check what was uploaded. Requires admin auth — the bucket is private and
 * has no storage.objects policies, so this route (via the service-role
 * client) is the only way to read the file back.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ reference: string }> },
) {
  const { reference } = await params

  try {
    await requireAdmin()
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Non authentifié.' },
      { status: 401 },
    )
  }

  const supabase = createAdminClient()

  const { data: order } = await supabase
    .from('orders')
    .select('invoice_path')
    .eq('reference', reference)
    .maybeSingle()

  if (!order?.invoice_path) {
    return NextResponse.json({ error: 'Aucune facture pour cette commande.' }, { status: 404 })
  }

  const { data: blob, error: downloadError } = await supabase.storage
    .from(INVOICE_BUCKET)
    .download(order.invoice_path)

  if (downloadError || !blob) {
    return NextResponse.json({ error: 'Impossible de charger la facture.' }, { status: 500 })
  }

  const pdf = Buffer.from(await blob.arrayBuffer())

  return new NextResponse(pdf as unknown as BodyInit, {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `inline; filename="facture-${reference}.pdf"`,
      'Cache-Control': 'private, no-store',
    },
  })
}
