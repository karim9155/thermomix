import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { getCustomer } from '@/lib/compte/guard'
import { safeNext } from '@/lib/compte/safe-next'
import { SigninForm } from '@/components/compte/auth-forms'

export const metadata: Metadata = {
  title: 'Connexion — INOCASA',
  robots: { index: false, follow: false },
}

export default async function ConnexionPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; erreur?: string }>
}) {
  const { next, erreur } = await searchParams
  const target = safeNext(next)

  // Already signed in — nothing to do here.
  const customer = await getCustomer()
  if (customer) {
    redirect(target)
  }

  return (
    <div className="compte-auth-page">
      <div className="compte-auth-card">
        <p className="eyebrow">INOCASA</p>
        <h1>Connexion</h1>
        <p className="compte-auth-intro">
          Connectez-vous pour suivre vos commandes et télécharger vos factures.
        </p>
        {erreur === 'lien' ? (
          <p className="form-error">
            Ce lien de confirmation a expiré ou a déjà été utilisé. Connectez-vous, ou créez à
            nouveau votre compte.
          </p>
        ) : null}
        <SigninForm next={target} />
      </div>
    </div>
  )
}
