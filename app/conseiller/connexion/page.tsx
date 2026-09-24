import Image from 'next/image'
import { redirect } from 'next/navigation'
import type { Metadata } from 'next'
import { getAdvisorSession } from '@/lib/conseiller/guard'
import { AdvisorLoginForm } from '@/components/conseiller/forms'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = { title: 'Connexion' }

const NOTICES: Record<string, string> = {
  suspendu: "Votre compte conseiller est suspendu. Contactez l'administration.",
}

export default async function ConseillerConnexionPage({
  searchParams,
}: {
  searchParams: Promise<{ erreur?: string }>
}) {
  const { erreur } = await searchParams
  const { advisor } = await getAdvisorSession()

  // Already signed in as an active advisor: nothing to do here.
  if (advisor?.status === 'actif') redirect('/conseiller')

  return (
    <div className="admin-login-page">
      <div className="admin-login-card">
        <Image
          className="admin-login-mark"
          src="/inocasa-logo-icone.png"
          alt="INOCASA"
          width={300}
          height={300}
          sizes="64px"
          priority
        />
        <p className="eyebrow">INOCASA · ESPACE CONSEILLER</p>
        <h1>Connexion</h1>
        <AdvisorLoginForm notice={erreur ? NOTICES[erreur] : undefined} />
      </div>
    </div>
  )
}
