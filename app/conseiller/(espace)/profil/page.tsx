import { notFound } from 'next/navigation'
import { requireAdvisorPage } from '@/lib/conseiller/guard'
import { getAdvisorDetail } from '@/lib/conseiller/network'
import { OwnProfileForm } from '@/components/conseiller/forms'

export const metadata = { title: 'Profil' }

export default async function ProfilPage() {
  const session = await requireAdvisorPage()
  const advisor = await getAdvisorDetail(session.id)
  if (!advisor) notFound()

  return (
    <div className="admin-page advisor-narrow-page">
      <h1>Mon profil</h1>

      <section className="admin-card advisor-card-gap">
        <h2>Compte</h2>
        <dl className="admin-def-list advisor-facts">
          <div>
            <dt>Email</dt>
            <dd>{advisor.email}</dd>
          </div>
          <div>
            <dt>Région</dt>
            <dd>{advisor.region}</dd>
          </div>
          <div>
            <dt>Grade</dt>
            <dd>{advisor.gradeName}</dd>
          </div>
        </dl>
        <p className="admin-muted advisor-help">
          Pour changer d&apos;email ou de région, contactez l&apos;administration.
        </p>
      </section>

      <section className="admin-card">
        <h2>Mes informations</h2>
        <OwnProfileForm
          values={{ prenom: advisor.prenom, nom: advisor.nom, telephone: advisor.telephone }}
        />
      </section>
    </div>
  )
}
