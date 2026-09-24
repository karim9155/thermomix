import Image from 'next/image'
import { redirect } from 'next/navigation'
import type { Metadata } from 'next'
import { getAdvisorSession } from '@/lib/conseiller/guard'
import { PasswordForm } from '@/components/conseiller/forms'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = { title: 'Mot de passe' }

/**
 * Outside the (espace) group on purpose: an invited advisor has no
 * password yet, and requireAdvisorPage() would send them straight back
 * here. This page accepts `invite` and `actif`, and nothing else.
 */
export default async function MotDePassePage() {
  const { advisor } = await getAdvisorSession()

  if (!advisor) redirect('/conseiller/connexion')
  if (advisor.status === 'suspendu') redirect('/conseiller/connexion?erreur=suspendu')

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
        <h1>Choisissez votre mot de passe</h1>
        <p className="advisor-login-intro">
          {advisor.prenom}, vous vous connecterez ensuite avec {advisor.email}.
        </p>
        <PasswordForm />
      </div>
    </div>
  )
}
