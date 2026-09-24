import Link from 'next/link'
import {
  WORKSHOP_STATUS_CLASS,
  WORKSHOP_STATUS_LABELS,
  dateTimeFormatter,
  formatAmount,
  type Workshop,
} from '@/lib/conseiller/format'

// Presentational pieces for workshops, shared by the advisor's pages and
// the admin's (E6, E7, E8). Server Components.

export function WorkshopStatusBadge({ workshop }: { workshop: Workshop }) {
  return (
    <span className={`admin-badge ${WORKSHOP_STATUS_CLASS[workshop.status]}`}>
      {WORKSHOP_STATUS_LABELS[workshop.status]}
    </span>
  )
}

/** Share of guests who bought, 0–1 — the conversion rate of E8. */
export function conversion(workshop: Pick<Workshop, 'invitedCount' | 'salesCount'>): number | null {
  return workshop.invitedCount > 0 ? workshop.salesCount / workshop.invitedCount : null
}

export function formatPercent(value: number | null): string {
  return value === null ? '—' : `${Math.round(value * 100)} %`
}

export function WorkshopsTable({
  workshops,
  hrefBase,
  showAdvisor = false,
}: {
  workshops: Workshop[]
  hrefBase: string
  showAdvisor?: boolean
}) {
  if (workshops.length === 0) return <p className="admin-empty">Aucun atelier.</p>

  return (
    <div className="admin-table-scroll">
      <table className="admin-table">
        <thead>
          <tr>
            <th>Date</th>
            {showAdvisor ? <th>Conseiller</th> : null}
            <th>Hôte / lieu</th>
            <th className="advisor-num">Invités</th>
            <th className="advisor-num">Présents</th>
            <th className="advisor-num">Ventes</th>
            <th className="advisor-num">Conversion</th>
            <th>Statut</th>
          </tr>
        </thead>
        <tbody>
          {workshops.map((workshop) => (
            <tr key={workshop.id}>
              <td>
                <Link href={`${hrefBase}/${workshop.id}`} className="admin-table-link">
                  {dateTimeFormatter.format(new Date(workshop.scheduledAt))}
                </Link>
              </td>
              {showAdvisor ? <td>{workshop.advisorName}</td> : null}
              <td>
                {workshop.hostName ?? '—'}
                <div className="admin-muted advisor-table-sub">
                  {workshop.location}, {workshop.gouvernorat}
                </div>
              </td>
              <td className="advisor-num">{workshop.invitedCount}</td>
              <td className="advisor-num">{workshop.attendeesCount ?? '—'}</td>
              <td className="advisor-num">{workshop.salesCount}</td>
              <td className="advisor-num">
                {workshop.status === 'effectue' ? formatPercent(conversion(workshop)) : '—'}
              </td>
              <td>
                <WorkshopStatusBadge workshop={workshop} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

/** A workshop's facts and, once done, its report (E4, E8). */
export function WorkshopFacts({ workshop }: { workshop: Workshop }) {
  return (
    <dl className="admin-def-list advisor-facts">
      <div>
        <dt>Date</dt>
        <dd>{dateTimeFormatter.format(new Date(workshop.scheduledAt))}</dd>
      </div>
      <div>
        <dt>Lieu</dt>
        <dd>
          {workshop.location}, {workshop.gouvernorat}
        </dd>
      </div>
      <div>
        <dt>Hôte</dt>
        <dd>{workshop.hostName ?? '—'}</dd>
      </div>
      <div>
        <dt>Invités</dt>
        <dd>{workshop.invitedCount}</dd>
      </div>
      {workshop.status === 'effectue' ? (
        <>
          <div>
            <dt>Présents</dt>
            <dd>
              {workshop.attendeesCount}
              {workshop.invitedCount > 0 && workshop.attendeesCount !== null
                ? ` (${formatPercent(workshop.attendeesCount / workshop.invitedCount)} des invités)`
                : ''}
            </dd>
          </div>
          <div>
            <dt>Contacts obtenus</dt>
            <dd>{workshop.contactsCount ?? 0}</dd>
          </div>
          <div>
            <dt>Ventes issues</dt>
            <dd>
              {workshop.salesCount} · {formatAmount(workshop.salesTotal)}
            </dd>
          </div>
          <div>
            <dt>Conversion invités → ventes</dt>
            <dd>{formatPercent(conversion(workshop))}</dd>
          </div>
        </>
      ) : null}
      {workshop.status === 'annule' && workshop.cancelReason ? (
        <div>
          <dt>Motif d&apos;annulation</dt>
          <dd>{workshop.cancelReason}</dd>
        </div>
      ) : null}
      {workshop.notes ? (
        <div>
          <dt>Notes</dt>
          <dd>{workshop.notes}</dd>
        </div>
      ) : null}
    </dl>
  )
}

export function WorkshopReportText({ workshop }: { workshop: Workshop }) {
  if (!workshop.feedback && !workshop.observations) {
    return <p className="admin-empty">Pas de commentaire dans le rapport.</p>
  }
  return (
    <div className="workshop-report">
      {workshop.feedback ? (
        <>
          <h3 className="advisor-subheading advisor-subheading-flush">Retours des participants</h3>
          <p>{workshop.feedback}</p>
        </>
      ) : null}
      {workshop.observations ? (
        <>
          <h3 className="advisor-subheading">Observations</h3>
          <p>{workshop.observations}</p>
        </>
      ) : null}
    </div>
  )
}
