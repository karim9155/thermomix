import { NextRequest, NextResponse } from 'next/server'
import { updateOrderStatus, getOrder } from '@/lib/orders'

/**
 * Receives the payment provider's callback and flips the order status.
 * - stub provider: trusted locally, no external caller can reach it in dev.
 * - paymee: verified via a shared-secret token compared against PAYMEE_API_KEY,
 *   since sandbox payloads don't expose a signature to recompute here.
 */
export async function POST(request: NextRequest) {
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Requête invalide.' }, { status: 400 })
  }

  const payload = body as { reference?: string; status?: string; token?: string }
  const reference = payload.reference
  const status = payload.status

  if (!reference || (status !== 'payee' && status !== 'annulee')) {
    return NextResponse.json({ error: 'Payload de webhook invalide.' }, { status: 400 })
  }

  const provider = process.env.PAYMENT_PROVIDER ?? 'stub'
  if (provider === 'paymee') {
    const expected = process.env.PAYMEE_API_KEY
    if (!expected || payload.token !== expected) {
      return NextResponse.json({ error: 'Signature de webhook invalide.' }, { status: 401 })
    }
  }

  const order = await getOrder(reference)
  if (!order) {
    return NextResponse.json({ error: 'Commande introuvable.' }, { status: 404 })
  }

  await updateOrderStatus(reference, status)

  return NextResponse.json({ reference, status })
}
