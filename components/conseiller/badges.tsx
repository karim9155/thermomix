import {
  ADVISOR_STATUS_CLASS,
  ADVISOR_STATUS_LABELS,
  APPLICATION_STATUS_CLASS,
  APPLICATION_STATUS_LABELS,
  type AdvisorStatus,
  type ApplicationStatus,
} from '@/lib/conseiller/format'

// Shared by the admin pages and the advisor area, so they read from the
// client-safe format module, never from anything server-only.

export function AdvisorStatusBadge({ status }: { status: AdvisorStatus }) {
  return (
    <span className={`admin-badge ${ADVISOR_STATUS_CLASS[status]}`}>
      {ADVISOR_STATUS_LABELS[status]}
    </span>
  )
}

export function ApplicationStatusBadge({ status }: { status: ApplicationStatus }) {
  return (
    <span className={`admin-badge ${APPLICATION_STATUS_CLASS[status]}`}>
      {APPLICATION_STATUS_LABELS[status]}
    </span>
  )
}
