import Link from 'next/link'
import { Plus } from 'lucide-react'
import { listChallenges } from '@/lib/conseiller/challenges'
import { todayInTunis } from '@/lib/conseiller/sales'
import { CHALLENGE_STATUS_CLASS, CHALLENGE_STATUS_LABELS } from '@/lib/conseiller/format'
import { ChallengeCard } from '@/components/conseiller/challenge-display'

export const metadata = { title: 'Challenges' }

export default async function ChallengesPage() {
  const [challenges, today] = [await listChallenges(), todayInTunis()]

  // Published challenges whose end date has passed are waiting on the
  // admin to confirm winners.
  const toClose = challenges.filter((c) => c.status === 'publie' && c.endsOn < today)

  return (
    <div className="admin-page">
      <div className="admin-section-heading">
        <h1>Challenges</h1>
        <Link href="/admin-r/challenges/nouveau" className="primary-button">
          <Plus size={17} /> Nouveau challenge
        </Link>
      </div>

      {toClose.length > 0 ? (
        <p className="advisor-alert">
          {toClose.length} challenge{toClose.length > 1 ? 's' : ''} terminé
          {toClose.length > 1 ? 's' : ''} à clôturer : validez les gagnants pour verser les primes.
        </p>
      ) : null}

      {challenges.length === 0 ? (
        <p className="admin-empty">Aucun challenge pour le moment.</p>
      ) : (
        <div className="challenge-grid">
          {challenges.map((challenge) => (
            <div key={challenge.id} className="challenge-admin-item">
              <span className={`admin-badge ${CHALLENGE_STATUS_CLASS[challenge.status]}`}>
                {CHALLENGE_STATUS_LABELS[challenge.status]}
              </span>
              <ChallengeCard challenge={challenge} href={`/admin-r/challenges/${challenge.id}`} today={today} />
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
