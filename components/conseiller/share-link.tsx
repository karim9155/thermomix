import { Mail, MessageCircle, Smartphone } from 'lucide-react'
import { CopyButton } from '@/components/conseiller/copy-button'

/**
 * The advisor's link with copy and share buttons (I2, I3). The share
 * buttons are plain links into WhatsApp, SMS and email, so they work on
 * any phone without a share API.
 */
export function ShareLink({ url, code, name }: { url: string; code: string; name: string }) {
  const message = `Bonjour ! Découvrez Thermomix chez INOCASA avec mon lien de conseiller${name ? ` (${name})` : ''} : ${url}`
  const encoded = encodeURIComponent(message)

  return (
    <div className="advisor-share">
      <div className="advisor-link-box">
        <code>{url}</code>
        <CopyButton value={url} label="Copier le lien" />
      </div>
      <div className="advisor-code-row">
        <span className="admin-muted">Code :</span>
        <code className="advisor-code advisor-code-large">{code}</code>
        <CopyButton value={code} label="Copier le code" />
      </div>
      <div className="advisor-share-buttons">
        <a
          className="primary-button"
          href={`https://wa.me/?text=${encoded}`}
          target="_blank"
          rel="noopener noreferrer"
        >
          <MessageCircle size={16} /> WhatsApp
        </a>
        <a className="outline-button" href={`sms:?&body=${encoded}`}>
          <Smartphone size={16} /> SMS
        </a>
        <a
          className="outline-button"
          href={`mailto:?subject=${encodeURIComponent('Thermomix chez INOCASA')}&body=${encoded}`}
        >
          <Mail size={16} /> Email
        </a>
      </div>
    </div>
  )
}
