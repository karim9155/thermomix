import {
  BarChart3,
  Coins,
  Contact,
  FileText,
  Package,
  Presentation,
  Trophy,
  Truck,
  Users,
} from 'lucide-react'
import { logout } from '@/app/admin-r/(dashboard)/actions'
import { ConsoleShell, type ConsoleNavSection } from '@/components/console/console-shell'

const ICON = { size: 18, 'aria-hidden': true } as const

// Grouped by what the admin is doing: running the shop, then running the
// advisor network. Icons are elements (not components) so they can be
// handed to the client-side shell.
const SECTIONS: ConsoleNavSection[] = [
  {
    items: [{ href: '/admin-r/statistiques', label: 'Statistiques', icon: <BarChart3 {...ICON} /> }],
  },
  {
    title: 'Boutique',
    items: [
      {
        href: '/admin-r',
        label: 'Commandes',
        icon: <Truck {...ICON} />,
        exact: true,
        alsoMatches: ['/admin-r/livraisons'],
      },
      { href: '/admin-r/produits', label: 'Produits', icon: <Package {...ICON} /> },
    ],
  },
  {
    title: 'Conseillers',
    items: [
      { href: '/admin-r/conseillers', label: 'Conseillers', icon: <Users {...ICON} /> },
      { href: '/admin-r/bons-de-commande', label: 'Bons de commande', icon: <FileText {...ICON} /> },
      { href: '/admin-r/clients', label: 'Clients', icon: <Contact {...ICON} /> },
      { href: '/admin-r/ateliers', label: 'Ateliers', icon: <Presentation {...ICON} /> },
      { href: '/admin-r/challenges', label: 'Challenges', icon: <Trophy {...ICON} /> },
      { href: '/admin-r/remuneration', label: 'Rémunération', icon: <Coins {...ICON} /> },
    ],
  },
]

export function AdminShell({ email, children }: { email: string; children: React.ReactNode }) {
  return (
    <ConsoleShell
      brandLabel="Admin"
      homeHref="/admin-r"
      sections={SECTIONS}
      userLabel={email}
      logoutAction={logout}
    >
      {children}
    </ConsoleShell>
  )
}
