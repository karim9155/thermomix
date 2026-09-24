import Link from 'next/link'
import { notFound } from 'next/navigation'
import { UserPlus } from 'lucide-react'
import { requireAdvisorPage } from '@/lib/conseiller/guard'
import { getAdvisorDetail, listApplications } from '@/lib/conseiller/network'
import { dateFormatter } from '@/lib/conseiller/format'
import { AdvisorStatusBadge, ApplicationStatusBadge } from '@/components/conseiller/badges'

export const metadata = { title: 'Mon réseau' }

export default async function MonReseauPage() {
  const session = await requireAdvisorPage()

  const [advisor, applications] = await Promise.all([
    getAdvisorDetail(session.id),
    listApplications({ sponsorId: session.id }),
  ])

  if (!advisor) notFound()

  return (
    <div className="admin-page">
      <div className="admin-section-heading">
        <h1>Mon réseau</h1>
        <Link href="/conseiller/reseau/candidature" className="primary-button">
          <UserPlus size={17} /> Proposer une recrue
        </Link>
      </div>

      <section className="admin-card advisor-card-gap">
        <h2>Mon parrain</h2>
        {advisor.sponsor ? (
          <dl className="admin-def-list advisor-facts">
            <div>
              <dt>Nom</dt>
              <dd>
                {advisor.sponsor.prenom} {advisor.sponsor.nom}
              </dd>
            </div>
            <div>
              <dt>Grade</dt>
              <dd>{advisor.sponsor.gradeName}</dd>
            </div>
            <div>
              <dt>Téléphone</dt>
              <dd>
                <a href={`tel:${advisor.sponsor.telephone}`}>{advisor.sponsor.telephone}</a>
              </dd>
            </div>
            <div>
              <dt>Email</dt>
              <dd>
                <a href={`mailto:${advisor.sponsor.email}`}>{advisor.sponsor.email}</a>
              </dd>
            </div>
          </dl>
        ) : (
          <p className="admin-muted">Vous êtes conseiller fondateur : vous n&apos;avez pas de parrain.</p>
        )}
      </section>

      <section className="admin-section">
        <h2>Mes recrues directes ({advisor.recruits.length})</h2>
        {advisor.recruits.length === 0 ? (
          <p className="admin-empty">
            Vous n&apos;avez pas encore de recrue. Proposez quelqu&apos;un avec le bouton ci-dessus.
          </p>
        ) : (
          <div className="admin-table-scroll">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Nom</th>
                  <th>Téléphone</th>
                  <th>Région</th>
                  <th>Grade</th>
                  <th>Statut</th>
                  <th>Depuis</th>
                </tr>
              </thead>
              <tbody>
                {advisor.recruits.map((recruit) => (
                  <tr key={recruit.id}>
                    <td>
                      {recruit.prenom} {recruit.nom}
                    </td>
                    <td>
                      <a href={`tel:${recruit.telephone}`} className="admin-table-link">
                        {recruit.telephone}
                      </a>
                    </td>
                    <td>{recruit.region}</td>
                    <td>{recruit.gradeName}</td>
                    <td>
                      <AdvisorStatusBadge status={recruit.status} />
                    </td>
                    <td>{dateFormatter.format(new Date(recruit.createdAt))}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="admin-section">
        <h2>Mes candidatures</h2>
        {applications.length === 0 ? (
          <p className="admin-empty">Aucune candidature envoyée.</p>
        ) : (
          <div className="admin-table-scroll">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Recrue</th>
                  <th>Envoyée le</th>
                  <th>Statut</th>
                  <th>Motif</th>
                </tr>
              </thead>
              <tbody>
                {applications.map((application) => (
                  <tr key={application.id}>
                    <td>
                      {application.prenom} {application.nom}
                    </td>
                    <td>{dateFormatter.format(new Date(application.createdAt))}</td>
                    <td>
                      <ApplicationStatusBadge status={application.status} />
                    </td>
                    <td>
                      {application.decisionReason ?? <span className="admin-muted">—</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  )
}
