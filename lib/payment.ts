export type CreatePaymentInput = {
  amount: number
  reference: string
  customer: {
    nom: string
    prenom: string
    email?: string
    telephone: string
  }
}

export type CreatePaymentResult = {
  paymentUrl: string
}

function getSiteUrl(): string {
  return process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'
}

async function createStubPayment(input: CreatePaymentInput): Promise<CreatePaymentResult> {
  const url = new URL('/paiement-simule', getSiteUrl())
  url.searchParams.set('ref', input.reference)
  return { paymentUrl: url.toString() }
}

async function createPaymeePayment(input: CreatePaymentInput): Promise<CreatePaymentResult> {
  const apiKey = process.env.PAYMEE_API_KEY
  if (!apiKey) {
    throw new Error('PAYMEE_API_KEY is not configured.')
  }

  const siteUrl = getSiteUrl()

  const response = await fetch('https://sandbox.paymee.tn/api/v2/payments/create', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Token ${apiKey}`,
    },
    body: JSON.stringify({
      amount: input.amount,
      note: `Commande INOCASA ${input.reference}`,
      first_name: input.customer.prenom,
      last_name: input.customer.nom,
      email: input.customer.email || 'client@inocasa.tn',
      phone: input.customer.telephone,
      return_url: `${siteUrl}/commande/confirmation?ref=${input.reference}`,
      cancel_url: `${siteUrl}/commande/echec?ref=${input.reference}`,
      webhook_url: `${siteUrl}/api/paiement/webhook`,
      order_id: input.reference,
    }),
  })

  if (!response.ok) {
    throw new Error(`Paymee a répondu avec le statut ${response.status}`)
  }

  const data = await response.json()
  const paymentUrl = data?.data?.payment_url

  if (!paymentUrl) {
    throw new Error("Paymee n'a pas retourné de payment_url.")
  }

  return { paymentUrl }
}

export async function createPayment(input: CreatePaymentInput): Promise<CreatePaymentResult> {
  const provider = process.env.PAYMENT_PROVIDER ?? 'stub'

  switch (provider) {
    case 'paymee':
      return createPaymeePayment(input)
    case 'stub':
    default:
      return createStubPayment(input)
  }
}
