import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { listApplications, listGrades } from '@/lib/conseiller/network'
import { dateFormatter } from '@/lib/conseiller/format'
import { ApplicationStatusBadge } from '@/components/conseiller/badges'
import { ApplicationDecision } from '@/components/admin/application-decision'

export const metadata = { title: 'Candidatures' }

export default async function CandidaturesPage() {
  const [applications, grades] = await Promise.all([listApplications(), listGrades()])

  const pending = applications.filter((application) => application.status === 'en_attente')
  const decided = applications.filter((application) => application.status !== 'en_attente')

  return (
    <div className="admin-page">
      <Link href="/admin-r/conseillers" className="back-link">
        <ArrowLeft size={16} /> Retour aux conseillers
      </Link>
      <h1>Candidatures de recrues</h1>

      <section className="admin-section advisor-first-section">
        <h2>En attente ({pending.length})</h2>
        {pending.length === 0 ? (
          <p className="admin-empty">Aucune candidature en attente.</p>
        ) : (
          <div className="advisor-application-list">
            {pending.map((application) => (
              <article key={application.id} className="admin-card advisor-application">
                <div className="advisor-application-head">
                  <div>
                    <strong>
                      {application.prenom} {application.nom}
                    </strong>
                    <span className="admin-muted">
                      Proposé par{' '}
                      <Link
                        href={`/admin-r/conseillers/${application.sponsorId}`}
                        className="admin-table-link"
                      >
                        {application.sponsorName}
                      </Link>{' '}
                      le {dateFormatter.format(new Date(application.createdAt))}
                    </span>
                  </div>
                  <ApplicationStatusBadge status={application.status} />
                </div>
                <dl className="admin-def-list advisor-application-facts">
                  <div>
                    <dt>Email</dt>
                    <dd>{application.email}</dd>
                  </div>
                  <div>
                    <dt>Téléphone</dt>
                    <dd>{application.telephone}</dd>
                  </div>
                  <div>
                    <dt>Région</dt>
                    <dd>{application.region}</dd>
                  </div>
                  {application.notes ? (
                    <div>
                      <dt>Notes du parrain</dt>
                      <dd>{application.notes}</dd>
                    </div>
                  ) : null}
                </dl>
                <ApplicationDecision applicationId={application.id} grades={grades} />
              </article>
            ))}
          </div>
        )}
      </section>

      <section className="admin-section">
        <h2>Traitées</h2>
        {decided.length === 0 ? (
          <p className="admin-empty">Aucune candidature traitée pour le moment.</p>
        ) : (
          <div className="admin-table-scroll">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Recrue</th>
                  <th>Parrain</th>
                  <th>Région</th>
                  <th>Décision</th>
                  <th>Le</th>
                  <th>Motif</th>
                </tr>
              </thead>
              <tbody>
                {decided.map((application) => (
                  <tr key={application.id}>
                    <td>
                      {application.advisorId ? (
                        <Link
                          href={`/admin-r/conseillers/${application.advisorId}`}
                          className="admin-table-link"
                        >
                          {application.prenom} {application.nom}
                        </Link>
                      ) : (
                        `${application.prenom} ${application.nom}`
                      )}
                    </td>
                    <td>{application.sponsorName}</td>
                    <td>{application.region}</td>
                    <td>
                      <ApplicationStatusBadge status={application.status} />
                    </td>
                    <td>
                      {application.decidedAt
                        ? dateFormatter.format(new Date(application.decidedAt))
                        : '—'}
                    </td>
                    <td>{application.decisionReason ?? <span className="admin-muted">—</span>}</td>
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
