import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { getCustomer } from '@/lib/compte/guard'
import { safeNext } from '@/lib/compte/safe-next'
import { SignupForm } from '@/components/compte/auth-forms'

export const metadata: Metadata = {
  title: 'Créer un compte — INOCASA',
  robots: { index: false, follow: false },
}

export default async function InscriptionPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>
}) {
  const { next } = await searchParams
  const target = safeNext(next)

  const customer = await getCustomer()
  if (customer) {
    redirect(target)
  }

  return (
    <div className="compte-auth-page">
      <div className="compte-auth-card">
        <p className="eyebrow">INOCASA</p>
        <h1>Créer un compte</h1>
        <p className="compte-auth-intro">
          Un compte est nécessaire pour passer commande et suivre vos livraisons.
        </p>
        <SignupForm next={target} />
      </div>
    </div>
  )
}
