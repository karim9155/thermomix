import Image from 'next/image'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ArrowLeft, Trophy } from 'lucide-react'
import { z } from 'zod'
import { requireAdvisorPage } from '@/lib/conseiller/guard'
import { getChallenge, listWinners, rankChallenge } from '@/lib/conseiller/challenges'
import { todayInTunis } from '@/lib/conseiller/sales'
import { formatAmount, formatScore } from '@/lib/conseiller/format'
import {
  ChallengeRules,
  RankingTable,
  challengePhase,
} from '@/components/conseiller/challenge-display'

export const metadata = { title: 'Challenge' }

export default async function ChallengePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  if (!z.uuid().safeParse(id).success) notFound()

  const advisor = await requireAdvisorPage()
  const challenge = await getChallenge(id, { visibleOnly: true })
  if (!challenge) notFound()

  const today = todayInTunis()
  const closed = challenge.status === 'cloture'
  const [ranking, winners] = await Promise.all([
    closed ? Promise.resolve([]) : rankChallenge(challenge, today),
    closed ? listWinners(challenge.id) : Promise.resolve([]),
  ])

  const mine = ranking.find((row) => row.advisorId === advisor.id)
  const iWon = winners.some((winner) => winner.advisorId === advisor.id)
  const phase = challengePhase(challenge, today)

  return (
    <div className="admin-page">
      <Link href="/conseiller/challenges" className="back-link">
        <ArrowLeft size={16} /> Retour aux challenges
      </Link>

      {challenge.imageUrl ? (
        <div className="challenge-banner">
          <Image src={challenge.imageUrl} alt="" fill sizes="(max-width: 1280px) 100vw, 1216px" priority />
        </div>
      ) : null}

      <h1>{challenge.title}</h1>

      {closed && iWon ? (
        <p className="advisor-success">
          <Trophy size={16} /> Félicitations, vous faites partie des gagnants !
          {challenge.prizeAmount > 0
            ? ` Votre prime de ${formatAmount(challenge.prizeAmount)} a été ajoutée à votre rémunération.`
            : ''}
        </p>
      ) : null}

      <div className="admin-detail-grid">
        <div className="admin-detail-main">
          {closed ? (
            <section className="admin-card">
              <h2>Gagnants</h2>
              {winners.length === 0 ? (
                <p className="admin-empty">Pas de gagnant sur ce challenge.</p>
              ) : (
                <ul className="advisor-simple-list">
                  {winners.map((winner) => (
                    <li key={winner.advisorId} className={winner.advisorId === advisor.id ? 'ranking-me' : undefined}>
                      <strong>
                        {winner.rank}. {winner.name}
                      </strong>
                      <span className="admin-muted">{formatScore(challenge.metric, winner.score)}</span>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          ) : phase === 'a_venir' ? (
            <section className="admin-card">
              <h2>Classement</h2>
              <p className="admin-empty">Le classement démarre le premier jour du challenge.</p>
            </section>
          ) : (
            <section className="admin-card">
              <h2>{phase === 'termine' ? 'Classement final (en attente de validation)' : 'Classement en direct'}</h2>
              <p className="admin-muted advisor-help">
                Mon score : <strong>{formatScore(challenge.metric, mine?.score ?? 0)}</strong>
                {mine && mine.score > 0 ? ` · ${mine.rank}ᵉ` : ''}
                {challenge.target !== null
                  ? ` · seuil : ${formatScore(challenge.metric, challenge.target)}`
                  : ''}
              </p>
              <RankingTable challenge={challenge} rows={ranking} highlightId={advisor.id} limit={10} />
            </section>
          )}
        </div>

        <aside className="admin-detail-side">
          <section className="admin-card">
            <h2>Règles</h2>
            <ChallengeRules challenge={challenge} />
            {challenge.description ? <p className="challenge-description">{challenge.description}</p> : null}
            <p className="admin-muted advisor-help">
              Seules les ventes entièrement payées pendant la période comptent.
            </p>
          </section>
        </aside>
      </div>
    </div>
  )
}
