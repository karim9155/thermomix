import { requireAdvisorPage } from '@/lib/conseiller/guard'
import { AdvisorShell } from '@/components/conseiller/advisor-shell'

export const dynamic = 'force-dynamic'

export default async function EspaceConseillerLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const advisor = await requireAdvisorPage()

  return <AdvisorShell name={`${advisor.prenom} ${advisor.nom}`}>{children}</AdvisorShell>
}
