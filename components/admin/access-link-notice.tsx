'use client'

import { MailCheck, TriangleAlert } from 'lucide-react'
import { CopyButton } from '@/components/conseiller/copy-button'
import type { AccessLinkResult } from '@/lib/conseiller/accounts'

/**
 * Shown to the admin after an invitation or reset link is generated.
 *
 * The link is displayed whether or not the email went out: it is how the
 * advisor gets in when email is not configured, and a quick way to pass
 * it on over WhatsApp. It opens the advisor's account, so the copy says
 * to send it to them only.
 */
export function AccessLinkNotice({ access }: { access: AccessLinkResult }) {
  return (
    <div className="advisor-access-notice">
      <p>
        {access.emailSent ? (
          <>
            <MailCheck size={16} /> Email envoyé au conseiller.
          </>
        ) : (
          <>
            <TriangleAlert size={16} /> Email non envoyé : transmettez ce lien au conseiller.
          </>
        )}
      </p>
      <div className="advisor-link-box">
        <code>{access.link}</code>
        <CopyButton value={access.link} label="Copier le lien" />
      </div>
      <small>Lien personnel, à usage unique : à transmettre uniquement au conseiller concerné.</small>
    </div>
  )
}
