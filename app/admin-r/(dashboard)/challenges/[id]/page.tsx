import Image from 'next/image'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import { z } from 'zod'
import {
  getChallenge,
  listWinners,
  proposedWinners,
  rankChallenge,
} from '@/lib/conseiller/challenges'
import { todayInTunis } from '@/lib/conseiller/sales'
import {
  CHALLENGE_STATUS_CLASS,
  CHALLENGE_STATUS_LABELS,
  formatAmount,
  formatScore,
} from '@/lib/conseiller/format'
import { formatDay } from '@/components/conseiller/sale-summary'
import { ChallengeRules, RankingTable } from '@/components/conseiller/challenge-display'
import { ChallengeForm } from '@/components/admin/challenge-form'
import {
  ChallengeStatusControls,
  CloseChallengePanel,
} from '@/components/admin/challenge-admin-controls'

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  if (!z.uuid().safeParse(id).success) return { title: 'Challenge' }
  const challenge = await getChallenge(id)
  return { title: challenge?.title ?? 'Challenge' }
}

export default async function ChallengeAdminPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  if (!z.uuid().safeParse(id).success) notFound()

  const challenge = await getChallenge(id)
  if (!challenge) notFound()

  const today = todayInTunis()
  const closed = challenge.status === 'cloture'
  const [ranking, winners] = await Promise.all([
    closed ? Promise.resolve([]) : rankChallenge(challenge, today),
    closed ? listWinners(challenge.id) : Promise.resolve([]),
  ])
  const readyToClose = challenge.status === 'publie' && challenge.endsOn < today

  return (
    <div className="admin-page">
      <Link href="/admin-r/challenges" className="back-link">
        <ArrowLeft size={16} /> Retour aux challenges
      </Link>

      <div className="admin-detail-heading">
        <div>
          <h1>{challenge.title}</h1>
          <div className="advisor-heading-meta">
            <span className={`admin-badge ${CHALLENGE_STATUS_CLASS[challenge.status]}`}>
              {CHALLENGE_STATUS_LABELS[challenge.status]}
            </span>
            {closed && challenge.closedAt ? (
              <span className="admin-muted">Clôturé le {formatDay(challenge.closedAt.slice(0, 10))}</span>
            ) : null}
          </div>
        </div>
        {!closed ? <ChallengeStatusControls challenge={challenge} /> : null}
      </div>

      <div className="admin-detail-grid">
        <div className="admin-detail-main">
          {readyToClose ? (
            <section className="admin-card">
              <h2>Clôture : gagnants</h2>
              <p className="admin-muted advisor-help">
                Les gagnants selon la règle sont cochés. Ajustez si besoin, puis validez.
              </p>
              <CloseChallengePanel
                challenge={challenge}
                ranking={ranking}
                proposedIds={proposedWinners(challenge, ranking).map((row) => row.advisorId)}
              />
            </section>
          ) : null}

          {closed ? (
            <section className="admin-card">
              <h2>Gagnants</h2>
              {winners.length === 0 ? (
                <p className="admin-empty">Clôturé sans gagnant.</p>
              ) : (
                <ul className="advisor-simple-list">
                  {winners.map((winner) => (
                    <li key={winner.advisorId}>
                      <strong>
                        {winner.rank}. {winner.name}
                      </strong>
                      <span className="admin-muted">{formatScore(challenge.metric, winner.score)}</span>
                      {winner.prize > 0 ? (
                        <span className="admin-badge badge-green">{formatAmount(winner.prize)}</span>
                      ) : null}
                    </li>
                  ))}
                </ul>
              )}
            </section>
          ) : (
            <section className="admin-card">
              <h2>Classement en direct</h2>
              <RankingTable challenge={challenge} rows={ranking} />
            </section>
          )}

          {!closed ? (
            <section className="admin-card">
              <h2>Modifier</h2>
              <ChallengeForm challenge={challenge} today={today} />
            </section>
          ) : null}
        </div>

        <aside className="admin-detail-side">
          <section className="admin-card">
            {challenge.imageUrl ? (
              <div className="challenge-detail-visual">
                <Image src={challenge.imageUrl} alt="" fill sizes="400px" />
              </div>
            ) : null}
            <h2>Règles</h2>
            <ChallengeRules challenge={challenge} />
            {challenge.description ? <p className="challenge-description">{challenge.description}</p> : null}
          </section>
        </aside>
      </div>
    </div>
  )
}
