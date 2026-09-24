import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ArrowLeft, NotebookPen } from 'lucide-react'
import { z } from 'zod'
import {
  getAdvisorDetail,
  listAdvisors,
  listApplications,
  listGrades,
  subtreeIds,
} from '@/lib/conseiller/network'
import { listActivity } from '@/lib/conseiller/activity'
import { dateFormatter, dateTimeFormatter, formatAmount } from '@/lib/conseiller/format'
import { AdvisorStatusBadge, ApplicationStatusBadge } from '@/components/conseiller/badges'
import { ActivityFeed } from '@/components/conseiller/activity-feed'
import { AdvisorAccountControls } from '@/components/admin/advisor-account-controls'
import {
  AdvisorGradeForm,
  AdvisorIdentityForm,
  AdvisorSponsorForm,
} from '@/components/admin/advisor-edit-forms'
import { AffiliateCodeControls } from '@/components/admin/affiliate-code-controls'
import { affiliateUrl, getAffiliateStats } from '@/lib/conseiller/affiliation'
import { getAdvisorSnapshot } from '@/lib/conseiller/stats'
import { todayInTunis } from '@/lib/conseiller/sales'

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  if (!z.uuid().safeParse(id).success) return { title: 'Conseiller' }
  const advisor = await getAdvisorDetail(id)
  return { title: advisor ? `${advisor.prenom} ${advisor.nom}` : 'Conseiller' }
}

export default async function ConseillerDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params

  // Anything that isn't a uuid would only reach Postgres to fail its cast.
  if (!z.uuid().safeParse(id).success) notFound()

  const [advisor, grades, advisors, activity, applications, affiliate, snapshot] = await Promise.all([
    getAdvisorDetail(id),
    listGrades(),
    listAdvisors(),
    listActivity({ advisorId: id, limit: 30 }),
    listApplications({ sponsorId: id }),
    getAffiliateStats(id),
    getAdvisorSnapshot(id, todayInTunis()),
  ])

  if (!advisor) notFound()

  // An advisor can't be moved under themselves or anyone in their branch.
  const excluded = subtreeIds(advisors, advisor.id)
  const sponsorChoices = advisors
    .filter((candidate) => !excluded.has(candidate.id) && candidate.status !== 'suspendu')
    .map((candidate) => ({ id: candidate.id, name: `${candidate.prenom} ${candidate.nom}` }))

  return (
    <div className="admin-page">
      <Link href="/admin-r/conseillers" className="back-link">
        <ArrowLeft size={16} /> Retour aux conseillers
      </Link>

      <div className="admin-detail-heading">
        <div>
          <h1>
            {advisor.prenom} {advisor.nom}
          </h1>
          <div className="advisor-heading-meta">
            <AdvisorStatusBadge status={advisor.status} />
            <span className="admin-muted">
              {advisor.gradeName} · {advisor.region}
            </span>
          </div>
        </div>
        <AdvisorAccountControls advisorId={advisor.id} status={advisor.status} />
      </div>

      <div className="admin-detail-grid">
        <div className="admin-detail-main">
          {/* J10: the advisor at a glance — sales, workshops, network, pay. */}
          <section className="admin-card">
            <div className="admin-section-heading">
              <h2>Performance</h2>
              <Link
                href={`/admin-r/conseillers/${advisor.id}/journal`}
                className="outline-button advisor-small-button"
              >
                <NotebookPen size={14} /> Journal d&apos;activité
              </Link>
            </div>
            <div className="admin-table-scroll">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th />
                    <th className="advisor-num">Ce mois</th>
                    <th className="advisor-num">90 derniers jours</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>Chiffre d&apos;affaires</td>
                    <td className="advisor-num">{formatAmount(snapshot.month.revenue)}</td>
                    <td className="advisor-num">{formatAmount(snapshot.quarter.revenue)}</td>
                  </tr>
                  <tr>
                    <td>Ventes payées</td>
                    <td className="advisor-num">{snapshot.month.sales}</td>
                    <td className="advisor-num">{snapshot.quarter.sales}</td>
                  </tr>
                  <tr>
                    <td>Thermomix vendus</td>
                    <td className="advisor-num">{snapshot.month.robots}</td>
                    <td className="advisor-num">{snapshot.quarter.robots}</td>
                  </tr>
                  <tr>
                    <td>Recrues activées</td>
                    <td className="advisor-num">{snapshot.month.recruits}</td>
                    <td className="advisor-num">{snapshot.quarter.recruits}</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <dl className="admin-def-list advisor-facts advisor-section-gap">
              <div>
                <dt>Primes</dt>
                <dd>
                  {formatAmount(snapshot.commissionsMonth)} ce mois ·{' '}
                  {formatAmount(snapshot.commissionsTotal)} au total ·{' '}
                  {formatAmount(snapshot.paidOutTotal)} versées
                </dd>
              </div>
              <div>
                <dt>Activité</dt>
                <dd>
                  {snapshot.clients} client(s) · {snapshot.workshopsDone} atelier(s) effectué(s) ·{' '}
                  {snapshot.openSales} vente(s) en cours
                </dd>
              </div>
            </dl>
          </section>

          <section className="admin-card">
            <h2>Informations</h2>
            <dl className="admin-def-list advisor-facts">
              <div>
                <dt>Email</dt>
                <dd>
                  <a href={`mailto:${advisor.email}`}>{advisor.email}</a>
                </dd>
              </div>
              <div>
                <dt>Téléphone</dt>
                <dd>
                  <a href={`tel:${advisor.telephone}`}>{advisor.telephone}</a>
                </dd>
              </div>
              <div>
                <dt>Code d&apos;affiliation</dt>
                <dd>
                  <code className="advisor-code">{advisor.affiliateCode}</code>{' '}
                  {advisor.affiliateCodeActive ? null : (
                    <span className="admin-badge badge-red">Désactivé</span>
                  )}
                  <div className="admin-muted advisor-table-sub">{affiliateUrl(advisor.affiliateCode)}</div>
                  <div className="admin-muted advisor-table-sub">
                    {affiliate.clicks} clic{affiliate.clicks > 1 ? 's' : ''} · {affiliate.customers} client
                    {affiliate.customers > 1 ? 's' : ''} rattaché{affiliate.customers > 1 ? 's' : ''} ·{' '}
                    {affiliate.orders.length} commande{affiliate.orders.length > 1 ? 's' : ''} en ligne
                  </div>
                  <AffiliateCodeControls advisorId={advisor.id} active={advisor.affiliateCodeActive} />
                </dd>
              </div>
              <div>
                <dt>Créé le</dt>
                <dd>{dateFormatter.format(new Date(advisor.createdAt))}</dd>
              </div>
              <div>
                <dt>Activé le</dt>
                <dd>
                  {advisor.activatedAt
                    ? dateTimeFormatter.format(new Date(advisor.activatedAt))
                    : 'Pas encore activé'}
                </dd>
              </div>
            </dl>
            <h3 className="advisor-subheading">Modifier</h3>
            <AdvisorIdentityForm
              advisorId={advisor.id}
              values={{
                prenom: advisor.prenom,
                nom: advisor.nom,
                telephone: advisor.telephone,
                region: advisor.region,
              }}
            />
          </section>

          <section className="admin-card">
            <h2>Réseau</h2>
            <dl className="admin-def-list">
              <div>
                <dt>Parrain (upline)</dt>
                <dd>
                  {advisor.sponsor ? (
                    <Link
                      href={`/admin-r/conseillers/${advisor.sponsor.id}`}
                      className="admin-table-link"
                    >
                      {advisor.sponsor.prenom} {advisor.sponsor.nom}
                    </Link>
                  ) : (
                    'Aucun — conseiller fondateur'
                  )}
                </dd>
              </div>
            </dl>
            <h3 className="advisor-subheading">Réaffecter à un autre parrain</h3>
            <p className="admin-muted advisor-help">
              Ses recrues, et toute sa sous-branche, le suivent.
            </p>
            <AdvisorSponsorForm
              advisorId={advisor.id}
              currentSponsorId={advisor.sponsorId}
              sponsors={sponsorChoices}
            />

            <h3 className="advisor-subheading">Recrues directes ({advisor.recruits.length})</h3>
            {advisor.recruits.length === 0 ? (
              <p className="admin-empty">Aucune recrue pour le moment.</p>
            ) : (
              <ul className="advisor-simple-list">
                {advisor.recruits.map((recruit) => (
                  <li key={recruit.id}>
                    <Link href={`/admin-r/conseillers/${recruit.id}`} className="admin-table-link">
                      {recruit.prenom} {recruit.nom}
                    </Link>
                    <span className="admin-muted">{recruit.gradeName}</span>
                    <AdvisorStatusBadge status={recruit.status} />
                  </li>
                ))}
              </ul>
            )}

            {applications.length > 0 ? (
              <>
                <h3 className="advisor-subheading">Candidatures soumises</h3>
                <ul className="advisor-simple-list">
                  {applications.map((application) => (
                    <li key={application.id}>
                      <span>
                        {application.prenom} {application.nom}
                      </span>
                      <span className="admin-muted">
                        {dateFormatter.format(new Date(application.createdAt))}
                      </span>
                      <ApplicationStatusBadge status={application.status} />
                    </li>
                  ))}
                </ul>
              </>
            ) : null}
          </section>

          <section className="admin-card">
            <h2>Activité récente</h2>
            <ActivityFeed entries={activity} />
          </section>
        </div>

        <aside className="admin-detail-side">
          <section className="admin-card">
            <h2>Grade</h2>
            <AdvisorGradeForm
              advisorId={advisor.id}
              currentGradeId={advisor.gradeId}
              grades={grades}
            />
            <h3 className="advisor-subheading">Historique</h3>
            <ul className="admin-timeline">
              {advisor.gradeHistory.map((entry) => (
                <li key={entry.id}>
                  <span className="admin-timeline-dot" />
                  <div>
                    <strong>
                      {entry.fromGrade ? `${entry.fromGrade} → ${entry.toGrade}` : entry.toGrade}
                    </strong>
                    <span>
                      {dateFormatter.format(new Date(entry.effectiveAt))}
                      {entry.reason ? ` · ${entry.reason}` : ''}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          </section>
        </aside>
      </div>
    </div>
  )
}
