import Image from 'next/image'
import Link from 'next/link'
import {
  BarChart3,
  Coins,
  Contact,
  FileText,
  LogOut,
  Package,
  Presentation,
  Trophy,
  Truck,
  Users,
} from 'lucide-react'
import { logout } from '@/app/admin-r/(dashboard)/actions'

const NAV_ITEMS = [
  { href: '/admin-r', label: 'Commandes', Icon: Truck },
  { href: '/admin-r/statistiques', label: 'Statistiques', Icon: BarChart3 },
  { href: '/admin-r/produits', label: 'Produits', Icon: Package },
  { href: '/admin-r/bons-de-commande', label: 'Bons de commande', Icon: FileText },
  { href: '/admin-r/conseillers', label: 'Conseillers', Icon: Users },
  { href: '/admin-r/clients', label: 'Clients', Icon: Contact },
  { href: '/admin-r/remuneration', label: 'Rémunération', Icon: Coins },
  { href: '/admin-r/challenges', label: 'Challenges', Icon: Trophy },
  { href: '/admin-r/ateliers', label: 'Ateliers', Icon: Presentation },
]

export function AdminShell({
  email,
  children,
}: {
  email: string
  children: React.ReactNode
}) {
  return (
    <div className="admin-shell">
      <header className="admin-header">
        <Link href="/admin-r" className="admin-brand">
          <Image
            className="admin-brand-mark"
            src="/inocasa-logo-icone.png"
            alt=""
            width={300}
            height={300}
            sizes="44px"
            priority
          />
          INOCASA <small>Admin</small>
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
          <span className="admin-user-email">{email}</span>
          <form action={logout}>
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
