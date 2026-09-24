import Image from 'next/image'
import type { Metadata } from 'next'
import { ActivationForm } from '@/components/conseiller/forms'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = { title: 'Activation' }

/**
 * Where invitation and password-reset emails land. The page itself does
 * nothing with the token: verifying it happens when the advisor presses
 * the button (see activateAccess), so a mail scanner that opens the link
 * in advance cannot use up the one-time token.
 */
export default async function ActivationPage({
  searchParams,
}: {
  searchParams: Promise<{ token_hash?: string; type?: string }>
}) {
  const { token_hash: tokenHash = '', type = 'invite' } = await searchParams
  const isInvite = type === 'invite'

  return (
    <div className="admin-login-page">
      <div className="admin-login-card">
        <Image
          className="login-logo"
          src="/inocasa-vertical.png"
          alt="INOCASA"
          width={8001}
          height={7915}
          sizes="112px"
          priority
        />
        <p className="eyebrow">INOCASA · ESPACE CONSEILLER</p>
        <h1>{isInvite ? 'Bienvenue' : 'Nouveau mot de passe'}</h1>
        <p className="advisor-login-intro">
          {isInvite
            ? 'Votre compte conseiller est prêt. Continuez pour choisir votre mot de passe.'
            : 'Continuez pour choisir un nouveau mot de passe.'}
        </p>
        {tokenHash ? (
          <ActivationForm tokenHash={tokenHash} type={isInvite ? 'invite' : 'recovery'} />
        ) : (
          <p className="form-error">Lien incomplet. Utilisez le lien reçu par email.</p>
        )}
      </div>
    </div>
  )
}
