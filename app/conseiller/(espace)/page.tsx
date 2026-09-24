import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ArrowRight, Award, Link2, UserPlus, Users } from 'lucide-react'
import { requireAdvisorPage } from '@/lib/conseiller/guard'
import { getAdvisorDetail, listApplications } from '@/lib/conseiller/network'
import { listActivity } from '@/lib/conseiller/activity'
import { ActivityFeed } from '@/components/conseiller/activity-feed'
import { GradeProgressCard } from '@/components/conseiller/grade-progress'
import { getGradeProgress } from '@/lib/conseiller/grades'
import { todayInTunis } from '@/lib/conseiller/sales'

export const metadata = { title: 'Tableau de bord' }

export default async function ConseillerDashboardPage() {
  const session = await requireAdvisorPage()

  // Always the signed-in advisor's own id, from the guard — never the URL.
  const [advisor, applications, activity, progress] = await Promise.all([
    getAdvisorDetail(session.id),
    listApplications({ sponsorId: session.id }),
    listActivity({ advisorId: session.id, limit: 10 }),
    getGradeProgress(session.id, todayInTunis()),
  ])

  if (!advisor) notFound()

  const pendingApplications = applications.filter((a) => a.status === 'en_attente').length

  return (
    <div className="admin-page">
      <h1>Bonjour {advisor.prenom}</h1>

      <div className="admin-stat-grid advisor-stat-grid">
        <div className="admin-stat-card">
          <Award size={20} />
          <strong>{advisor.gradeName}</strong>
          <span>Mon grade</span>
        </div>
        <div className="admin-stat-card">
          <Users size={20} />
          <strong>{advisor.recruits.length}</strong>
          <span>Recrues directes</span>
        </div>
        <div className="admin-stat-card">
          <UserPlus size={20} />
          <strong>{pendingApplications}</strong>
          <span>Candidatures en attente</span>
        </div>
      </div>

      <div className="admin-detail-grid">
        <div className="admin-detail-main">
          <GradeProgressCard progress={progress} />

          <section className="admin-card">
            <h2>Mon code d&apos;affiliation</h2>
            <div className="advisor-code-row">
              <Link2 size={18} />
              <code className="advisor-code advisor-code-large">{advisor.affiliateCode}</code>
            </div>
            <p className="admin-muted advisor-help">
              Les commandes passées en ligne via votre lien vous sont attribuées automatiquement.
            </p>
            <Link href="/conseiller/parrainage" className="outline-button advisor-inline-link">
              <Link2 size={15} /> Partager mon lien
            </Link>
          </section>

          <section className="admin-card">
            <h2>Mon activité récente</h2>
            <ActivityFeed entries={activity} showActor={false} />
          </section>
        </div>

        <aside className="admin-detail-side">
          <section className="admin-card">
            <h2>Mon parrain</h2>
            {advisor.sponsor ? (
              <dl className="admin-def-list">
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
              </dl>
            ) : (
              <p className="admin-muted">Vous êtes conseiller fondateur.</p>
            )}
          </section>

          <Link href="/conseiller/reseau/candidature" className="primary-button advisor-cta">
            <UserPlus size={16} /> Proposer une recrue <ArrowRight size={16} />
          </Link>
        </aside>
      </div>
    </div>
  )
}
