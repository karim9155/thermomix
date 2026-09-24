'use client'

import { useEffect, useRef, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LogOut, Menu, X } from 'lucide-react'

export type ConsoleNavItem = {
  href: string
  label: string
  /** Rendered by the server shell: an element, not a component, so it can cross into this client component. */
  icon: React.ReactNode
  /** Only this exact path is "this page" (for a section's home). */
  exact?: boolean
  /** Other path prefixes that belong to this entry, e.g. an order's detail page under Commandes. */
  alsoMatches?: string[]
}

export type ConsoleNavSection = { title?: string; items: ConsoleNavItem[] }

function isActive(item: ConsoleNavItem, pathname: string): boolean {
  const matches = (prefix: string) => pathname === prefix || pathname.startsWith(`${prefix}/`)
  if (item.exact) return pathname === item.href
  return matches(item.href) || (item.alsoMatches ?? []).some(matches)
}

/**
 * The shell shared by /admin-r and /conseiller: a sidebar on desktop,
 * a top bar with a slide-in drawer below 1024px.
 *
 * Client component for three things only — the current page's highlight
 * (usePathname), the drawer's open state, and its keyboard/scroll
 * behaviour. The pages themselves stay Server Components: they arrive
 * here as `children` and are rendered untouched.
 */
export function ConsoleShell({
  brandLabel,
  homeHref,
  sections,
  userLabel,
  logoutAction,
  children,
}: {
  brandLabel: string
  homeHref: string
  sections: ConsoleNavSection[]
  userLabel: string
  logoutAction: () => Promise<void>
  children: React.ReactNode
}) {
  const pathname = usePathname()
  const [open, setOpen] = useState(false)
  const menuButton = useRef<HTMLButtonElement>(null)
  const closeButton = useRef<HTMLButtonElement>(null)

  // Following a link closes the drawer: the new page is what they asked for.
  useEffect(() => {
    setOpen(false)
  }, [pathname])

  // While the drawer is open: Escape closes it, the page behind doesn't
  // scroll, and focus moves into the drawer — then back to the menu
  // button when it closes, so keyboard users don't lose their place.
  useEffect(() => {
    if (!open) return
    closeButton.current?.focus()
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    function onKey(event: KeyboardEvent) {
      if (event.key === 'Escape') setOpen(false)
    }
    document.addEventListener('keydown', onKey)

    const button = menuButton.current
    return () => {
      document.body.style.overflow = previousOverflow
      document.removeEventListener('keydown', onKey)
      button?.focus()
    }
  }, [open])

  const brand = (
    <Link href={homeHref} className="console-brand">
      <Image
        className="console-brand-mark"
        src="/inocasa-logo-icone.png"
        alt=""
        width={300}
        height={300}
        sizes="36px"
        priority
      />
      <span>
        INOCASA <small>{brandLabel}</small>
      </span>
    </Link>
  )

  return (
    <div className="console">
      <header className="console-topbar">
        <button
          ref={menuButton}
          type="button"
          className="console-icon-button"
          aria-label="Ouvrir le menu"
          aria-expanded={open}
          aria-controls="console-sidebar"
          onClick={() => setOpen(true)}
        >
          <Menu size={22} />
        </button>
        {brand}
      </header>

      <aside
        id="console-sidebar"
        className={open ? 'console-sidebar is-open' : 'console-sidebar'}
        aria-label="Navigation"
      >
        <div className="console-sidebar-head">
          {brand}
          <button
            ref={closeButton}
            type="button"
            className="console-icon-button console-close"
            aria-label="Fermer le menu"
            onClick={() => setOpen(false)}
          >
            <X size={22} />
          </button>
        </div>

        <nav className="console-nav">
          {sections.map((section, index) => (
            <div key={section.title ?? index} className="console-nav-section">
              {section.title ? <p className="console-nav-title">{section.title}</p> : null}
              <ul>
                {section.items.map((item) => {
                  const active = isActive(item, pathname)
                  return (
                    <li key={item.href}>
                      <Link
                        href={item.href}
                        className={active ? 'console-nav-link is-active' : 'console-nav-link'}
                        aria-current={active ? 'page' : undefined}
                      >
                        {item.icon}
                        <span>{item.label}</span>
                      </Link>
                    </li>
                  )
                })}
              </ul>
            </div>
          ))}
        </nav>

        <div className="console-sidebar-foot">
          <span className="console-user" title={userLabel}>
            {userLabel}
          </span>
          <form action={logoutAction}>
            <button type="submit" className="console-logout">
              <LogOut size={16} /> Déconnexion
            </button>
          </form>
        </div>
      </aside>

      {/* Tapping outside the drawer closes it. Hidden from assistive tech:
          the close button is the accessible way out. */}
      <div
        className={open ? 'console-overlay is-open' : 'console-overlay'}
        aria-hidden="true"
        onClick={() => setOpen(false)}
      />

      <main className="console-main">{children}</main>
    </div>
  )
}
