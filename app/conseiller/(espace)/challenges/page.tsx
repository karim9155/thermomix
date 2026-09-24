import { requireAdvisorPage } from '@/lib/conseiller/guard'
import { listChallenges, listWonChallengeIds, rankChallenge } from '@/lib/conseiller/challenges'
import { todayInTunis } from '@/lib/conseiller/sales'
import { ChallengeCard, challengePhase } from '@/components/conseiller/challenge-display'

export const metadata = { title: 'Challenges' }

export default async function MurDesChallengesPage() {
  const advisor = await requireAdvisorPage()
  const today = todayInTunis()

  // Only published and closed challenges: drafts are the admin's.
  const [challenges, won] = await Promise.all([
    listChallenges({ visibleOnly: true }),
    listWonChallengeIds(advisor.id),
  ])

  // My live standing on each challenge that's still running (H4).
  const standings = new Map(
    await Promise.all(
      challenges
        .filter((c) => c.status === 'publie' && challengePhase(c, today) !== 'a_venir')
        .map(async (c) => {
          const row = (await rankChallenge(c, today)).find((entry) => entry.advisorId === advisor.id)
          return [c.id, row] as const
        }),
    ),
  )

  const running = challenges.filter((c) => c.status === 'publie' && challengePhase(c, today) === 'en_cours')
  const upcoming = challenges.filter((c) => c.status === 'publie' && challengePhase(c, today) === 'a_venir')
  const finished = challenges.filter((c) => challengePhase(c, today) === 'termine')

  const card = (c: (typeof challenges)[number]) => {
    const row = standings.get(c.id)
    return (
      <ChallengeCard
        key={c.id}
        challenge={c}
        href={`/conseiller/challenges/${c.id}`}
        today={today}
        mine={
          c.status === 'cloture'
            ? { score: 0, rank: null, won: won.has(c.id) }
            : row
              ? { score: row.score, rank: row.rank, won: false }
              : undefined
        }
      />
    )
  }

  return (
    <div className="admin-page">
      <h1>Challenges</h1>

      {challenges.length === 0 ? (
        <p className="admin-empty">Aucun challenge pour le moment. Revenez bientôt !</p>
      ) : null}

      {running.length > 0 ? (
        <section className="admin-section advisor-first-section">
          <h2>En cours</h2>
          <div className="challenge-grid">{running.map(card)}</div>
        </section>
      ) : null}

      {upcoming.length > 0 ? (
        <section className="admin-section">
          <h2>À venir</h2>
          <div className="challenge-grid">{upcoming.map(card)}</div>
        </section>
      ) : null}

      {finished.length > 0 ? (
        <section className="admin-section">
          <h2>Terminés</h2>
          <div className="challenge-grid">{finished.map(card)}</div>
        </section>
      ) : null}
    </div>
  )
}
