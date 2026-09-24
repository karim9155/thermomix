import {
  Coins,
  Contact,
  FileText,
  LayoutDashboard,
  Link2,
  Network,
  NotebookPen,
  Presentation,
  Trophy,
  UserRound,
} from 'lucide-react'
import { advisorLogout } from '@/app/conseiller/actions'
import { ConsoleShell, type ConsoleNavSection } from '@/components/console/console-shell'

const ICON = { size: 18, 'aria-hidden': true } as const

// The advisor area is a work console like /admin-r, not part of the shop,
// so it shares the admin's shell. Grouped by what the advisor is doing:
// selling, their network, and their own pay and records.
const SECTIONS: ConsoleNavSection[] = [
  {
    items: [
      { href: '/conseiller', label: 'Tableau de bord', icon: <LayoutDashboard {...ICON} />, exact: true },
    ],
  },
  {
    title: 'Vendre',
    items: [
      { href: '/conseiller/ventes', label: 'Ventes', icon: <FileText {...ICON} /> },
      { href: '/conseiller/clients', label: 'Clients', icon: <Contact {...ICON} /> },
      { href: '/conseiller/ateliers', label: 'Ateliers', icon: <Presentation {...ICON} /> },
      { href: '/conseiller/parrainage', label: 'Parrainage', icon: <Link2 {...ICON} /> },
    ],
  },
  {
    title: 'Réseau',
    items: [
      { href: '/conseiller/reseau', label: 'Mon réseau', icon: <Network {...ICON} /> },
      { href: '/conseiller/challenges', label: 'Challenges', icon: <Trophy {...ICON} /> },
    ],
  },
  {
    title: 'Moi',
    items: [
      { href: '/conseiller/remuneration', label: 'Rémunération', icon: <Coins {...ICON} /> },
      { href: '/conseiller/journal', label: 'Journal', icon: <NotebookPen {...ICON} /> },
      { href: '/conseiller/profil', label: 'Profil', icon: <UserRound {...ICON} /> },
    ],
  },
]

export function AdvisorShell({ name, children }: { name: string; children: React.ReactNode }) {
  return (
    <ConsoleShell
      brandLabel="Conseiller"
      homeHref="/conseiller"
      sections={SECTIONS}
      userLabel={name}
      logoutAction={advisorLogout}
    >
      {children}
    </ConsoleShell>
  )
}
