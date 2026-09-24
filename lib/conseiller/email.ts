import 'server-only'
import { FROM, esc, getResend, shell } from '@/lib/email'

export type AccessEmailKind = 'invitation' | 'reinitialisation'

const SUBJECTS: Record<AccessEmailKind, string> = {
  invitation: 'Votre espace conseiller INOCASA',
  reinitialisation: 'Réinitialisez votre mot de passe conseiller INOCASA',
}

function renderHtml(kind: AccessEmailKind, prenom: string, link: string): string {
  const intro =
    kind === 'invitation'
      ? "Votre compte conseiller INOCASA a été créé. Cliquez sur le bouton ci-dessous pour choisir votre mot de passe et accéder à votre espace."
      : "Un lien de réinitialisation de votre mot de passe conseiller a été demandé. Cliquez sur le bouton ci-dessous pour en choisir un nouveau."

  return shell(`
    <h1 style="font-size:22px;margin:0 0 16px">Bonjour ${esc(prenom)},</h1>
    <p style="font-size:14px;line-height:1.6">${intro}</p>
    <p style="margin:28px 0">
      <a href="${esc(link)}" style="background:#00a758;color:#fff;padding:13px 22px;border-radius:999px;text-decoration:none;font-weight:bold;font-size:14px">
        ${kind === 'invitation' ? 'Activer mon compte' : 'Choisir un nouveau mot de passe'}
      </a>
    </p>
    <p style="font-size:12px;color:#6b7280;line-height:1.6">
      Ce lien est personnel et ne fonctionne qu'une seule fois. S'il a expiré,
      demandez-en un nouveau à l'administration INOCASA.
    </p>`)
}

/**
 * Sends an invitation or password-reset link to an advisor.
 *
 * Returns whether it was actually sent. Without RESEND_API_KEY (local
 * development) nothing goes out and the link is logged instead — the admin
 * page also shows it, so it can be passed on by hand either way.
 */
export async function sendAdvisorAccessEmail(input: {
  kind: AccessEmailKind
  to: string
  prenom: string
  link: string
}): Promise<boolean> {
  const resend = getResend()

  if (!resend) {
    console.log(`[email] RESEND_API_KEY absente — lien conseiller (${input.kind}) : ${input.link}`)
    return false
  }

  try {
    const { error } = await resend.emails.send({
      from: FROM,
      to: input.to,
      subject: SUBJECTS[input.kind],
      html: renderHtml(input.kind, input.prenom, input.link),
    })
    if (error) {
      console.error(`[email] Email conseiller refusé (${input.kind}):`, error)
      return false
    }
    return true
  } catch (error) {
    console.error(`[email] Email conseiller échoué (${input.kind}):`, error)
    return false
  }
}
