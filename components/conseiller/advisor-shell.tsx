import Image from 'next/image'
import Link from 'next/link'
import {
  Coins,
  Contact,
  FileText,
  LayoutDashboard,
  Link2,
  LogOut,
  Network,
  Trophy,
  UserRound,
} from 'lucide-react'
import { advisorLogout } from '@/app/conseiller/actions'

const NAV_ITEMS = [
  { href: '/conseiller', label: 'Tableau de bord', Icon: LayoutDashboard },
  { href: '/conseiller/ventes', label: 'Ventes', Icon: FileText },
  { href: '/conseiller/clients', label: 'Clients', Icon: Contact },
  { href: '/conseiller/remuneration', label: 'Rémunération', Icon: Coins },
  { href: '/conseiller/parrainage', label: 'Parrainage', Icon: Link2 },
  { href: '/conseiller/challenges', label: 'Challenges', Icon: Trophy },
  { href: '/conseiller/reseau', label: 'Mon réseau', Icon: Network },
  { href: '/conseiller/profil', label: 'Profil', Icon: UserRound },
]

/**
 * The advisor area is a work console like /admin-r, not part of the shop,
 * so it reuses the admin shell's layout and classes rather than the
 * storefront header. Later phases add their entries to NAV_ITEMS.
 */
export function AdvisorShell({ name, children }: { name: string; children: React.ReactNode }) {
  return (
    <div className="admin-shell">
      <header className="admin-header">
        <Link href="/conseiller" className="admin-brand">
          <Image
            className="admin-brand-mark"
            src="/inocasa-logo-icone.png"
            alt=""
            width={300}
            height={300}
            sizes="44px"
            priority
          />
          INOCASA <small>Conseiller</small>
        </Link>

        <nav className="admin-nav">
          {NAV_ITEMS.map(({ href, label, Icon }) => (
            <Link key={href} href={href} className="admin-nav-link">
              <Icon size={16} />
              {label}
            </Link>
          ))}
        </nav>

        <div className="admin-header-actions">
          <span className="admin-user-email">{name}</span>
          <form action={advisorLogout}>
            <button type="submit" className="outline-button admin-logout">
              <LogOut size={15} /> Déconnexion
            </button>
          </form>
        </div>
      </header>

      <main className="admin-main">{children}</main>
    </div>
  )
}
