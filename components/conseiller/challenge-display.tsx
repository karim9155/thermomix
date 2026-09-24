import Image from 'next/image'
import Link from 'next/link'
import { CalendarDays, Gift, Trophy } from 'lucide-react'
import {
  CHALLENGE_METRIC_LABELS,
  formatAmount,
  formatScore,
  type Challenge,
  type RankingRow,
} from '@/lib/conseiller/format'
import { formatDay } from '@/components/conseiller/sale-summary'

// Presentational pieces for challenges, shared by the admin pages and
// the advisors' wall (H3, H4). Server Components.

export function challengePhase(challenge: Challenge, today: string): 'a_venir' | 'en_cours' | 'termine' {
  if (challenge.status === 'cloture' || challenge.endsOn < today) return 'termine'
  return challenge.startsOn > today ? 'a_venir' : 'en_cours'
}

const PHASE_LABEL = { a_venir: 'À venir', en_cours: 'En cours', termine: 'Terminé' }
const PHASE_CLASS = { a_venir: 'badge-gray', en_cours: 'badge-green', termine: 'badge-blue' }

export function ChallengeCard({
  challenge,
  href,
  today,
  mine,
}: {
  challenge: Challenge
  href: string
  today: string
  /** The viewing advisor's own standing, on the wall. */
  mine?: { score: number; rank: number | null; won: boolean }
}) {
  const phase = challengePhase(challenge, today)

  return (
    <Link href={href} className="challenge-card">
      <div className="challenge-card-visual">
        {challenge.imageUrl ? (
          <Image src={challenge.imageUrl} alt="" fill sizes="(max-width: 760px) 100vw, 400px" />
        ) : (
          <Trophy size={40} />
        )}
        <span className={`admin-badge ${PHASE_CLASS[phase]}`}>{PHASE_LABEL[phase]}</span>
      </div>
      <div className="challenge-card-body">
        <strong>{challenge.title}</strong>
        <span className="admin-muted">
          <CalendarDays size={13} /> {formatDay(challenge.startsOn)} → {formatDay(challenge.endsOn)}
        </span>
        <span className="admin-muted">{CHALLENGE_METRIC_LABELS[challenge.metric]}</span>
        {challenge.rewardLabel || challenge.prizeAmount > 0 ? (
          <span className="challenge-reward">
            <Gift size={13} /> {challenge.rewardLabel || formatAmount(challenge.prizeAmount)}
          </span>
        ) : null}
        {mine ? (
          <span className="challenge-mine">
            {mine.won
              ? 'Vous avez gagné !'
              : `Mon score : ${formatScore(challenge.metric, mine.score)}${mine.rank && mine.score > 0 ? ` · ${mine.rank}ᵉ` : ''}`}
          </span>
        ) : null}
      </div>
    </Link>
  )
}

/** The rules of a challenge in plain words. */
export function ChallengeRules({ challenge }: { challenge: Challenge }) {
  const metric = CHALLENGE_METRIC_LABELS[challenge.metric].toLowerCase()
  const target = challenge.target !== null ? formatScore(challenge.metric, challenge.target) : null

  let rule: string
  if (challenge.winnersCount !== null && target) {
    rule = `Les ${challenge.winnersCount} meilleur(s) classement(s) ayant atteint ${target} (${metric}) gagnent.`
  } else if (challenge.winnersCount !== null) {
    rule = `Les ${challenge.winnersCount} meilleur(s) classement(s) (${metric}) gagnent.`
  } else {
    rule = `Tous ceux qui atteignent ${target} (${metric}) gagnent.`
  }

  return (
    <dl className="admin-def-list advisor-facts">
      <div>
        <dt>Période</dt>
        <dd>
          Du {formatDay(challenge.startsOn)} au {formatDay(challenge.endsOn)} inclus
        </dd>
      </div>
      <div>
        <dt>Objectif</dt>
        <dd>{CHALLENGE_METRIC_LABELS[challenge.metric]}</dd>
      </div>
      <div>
        <dt>Règle</dt>
        <dd>{rule}</dd>
      </div>
      <div>
        <dt>Récompense</dt>
        <dd>
          {[challenge.rewardLabel, challenge.prizeAmount > 0 ? `${formatAmount(challenge.prizeAmount)} de prime` : null]
            .filter(Boolean)
            .join(' · ') || '—'}
        </dd>
      </div>
    </dl>
  )
}

export function RankingTable({
  challenge,
  rows,
  highlightId,
  limit,
}: {
  challenge: Challenge
  rows: RankingRow[]
  highlightId?: string
  limit?: number
}) {
  const scored = rows.filter((row) => row.score > 0)
  if (scored.length === 0) {
    return <p className="admin-empty">Pas encore de score sur ce challenge.</p>
  }

  const shown = limit ? scored.slice(0, limit) : scored
  const mine = highlightId ? scored.find((row) => row.advisorId === highlightId) : undefined
  const mineHidden = mine && !shown.includes(mine)

  return (
    <div className="admin-table-scroll">
      <table className="admin-table">
        <thead>
          <tr>
            <th>Rang</th>
            <th>Conseiller</th>
            <th className="advisor-num">Score</th>
            {challenge.target !== null ? <th>Seuil</th> : null}
          </tr>
        </thead>
        <tbody>
          {[...shown, ...(mineHidden ? [mine] : [])].map((row) => (
            <tr key={row.advisorId} className={row.advisorId === highlightId ? 'ranking-me' : undefined}>
              <td>{row.rank}</td>
              <td>{row.name}</td>
              <td className="advisor-num">{formatScore(challenge.metric, row.score)}</td>
              {challenge.target !== null ? (
                <td>
                  {row.reachedTarget ? (
                    <span className="admin-badge badge-green">Atteint</span>
                  ) : (
                    <span className="admin-muted">—</span>
                  )}
                </td>
              ) : null}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
