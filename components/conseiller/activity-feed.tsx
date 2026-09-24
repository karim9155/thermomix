import { activityLabel, dateTimeFormatter, type ActivityEntry } from '@/lib/conseiller/format'

const ROLE_LABELS: Record<ActivityEntry['actorRole'], string> = {
  conseiller: 'Conseiller',
  admin: 'Admin',
  systeme: 'Système',
}

/**
 * Presentational only, so the admin and the advisor area can both render
 * it from a Server Component. `showAdvisor` adds the advisor's name, for
 * the network-wide feed where entries are about different people.
 */
export function ActivityFeed({
  entries,
  showAdvisor = false,
  showActor = true,
}: {
  entries: ActivityEntry[]
  showAdvisor?: boolean
  showActor?: boolean
}) {
  if (entries.length === 0) {
    return <p className="admin-empty">Aucune activité enregistrée pour le moment.</p>
  }

  return (
    <ul className="admin-timeline">
      {entries.map((entry) => (
        <li key={entry.id}>
          <span className="admin-timeline-dot" />
          <div>
            <strong>
              {showAdvisor && entry.advisorName ? `${entry.advisorName} — ` : ''}
              {activityLabel(entry.action)}
            </strong>
            <span>
              {dateTimeFormatter.format(new Date(entry.createdAt))}
              {showActor ? ` · ${ROLE_LABELS[entry.actorRole]}` : ''}
              {typeof entry.details.motif === 'string' ? ` · Motif : ${entry.details.motif}` : ''}
            </span>
          </div>
        </li>
      ))}
    </ul>
  )
}
