'use client'

import Image from 'next/image'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'
import { ChevronDown, Menu, Search, X } from 'lucide-react'
import { NAV_ITEMS, NAV_CTAS, isExternal, type NavChild, type NavItem } from '@/lib/nav-items'

/** Internal hrefs route through next/link; external ones open in a new tab. */
function NavLink({
  item,
  className,
  onClick,
}: {
  item: NavChild
  className?: string
  onClick?: () => void
}) {
  if (isExternal(item.href)) {
    return (
      <a
        href={item.href}
        className={className}
        target="_blank"
        rel="noopener noreferrer"
        onClick={onClick}
      >
        {item.label}
      </a>
    )
  }
  return (
    <Link href={item.href} className={className} onClick={onClick}>
      {item.label}
    </Link>
  )
}

function isActive(item: NavItem, pathname: string): boolean {
  return !isExternal(item.href) && pathname.startsWith(item.href)
}

function DesktopItem({ item, pathname }: { item: NavItem; pathname: string }) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    function handleClick(event: MouseEvent) {
      if (ref.current && !ref.current.contains(event.target as Node)) setOpen(false)
    }
    function handleEsc(event: KeyboardEvent) {
      if (event.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    document.addEventListener('keydown', handleEsc)
    return () => {
      document.removeEventListener('mousedown', handleClick)
      document.removeEventListener('keydown', handleEsc)
    }
  }, [])

  // Clear any pending close on unmount so a timer can't fire into a gone node.
  useEffect(() => () => {
    if (closeTimer.current) clearTimeout(closeTimer.current)
  }, [])

  if (!item.children) {
    return (
      <NavLink item={item} className={isActive(item, pathname) ? 'active' : undefined} />
    )
  }

  function cancelClose() {
    if (closeTimer.current) {
      clearTimeout(closeTimer.current)
      closeTimer.current = null
    }
  }

  return (
    <div
      className="nav-dropdown"
      ref={ref}
      onMouseEnter={() => {
        cancelClose()
        setOpen(true)
      }}
      // A small delay stops the panel snapping shut while the pointer
      // crosses the gap between the trigger and the panel below it.
      onMouseLeave={() => {
        cancelClose()
        closeTimer.current = setTimeout(() => setOpen(false), 120)
      }}
    >
      <button
        type="button"
        className={`nav-dropdown-trigger ${isActive(item, pathname) ? 'active' : ''}`}
        aria-expanded={open}
        aria-haspopup="true"
        onClick={() => setOpen((v) => !v)}
      >
        {item.label} <ChevronDown size={14} />
      </button>

      {open ? (
        <div className="nav-dropdown-panel">
          {item.children.map((child) => (
            <NavLink
              key={child.label}
              item={child}
              className="nav-dropdown-link"
              onClick={() => setOpen(false)}
            />
          ))}
        </div>
      ) : null}
    </div>
  )
}

export function SiteNav({ onSearch }: { onSearch?: () => void }) {
  const pathname = usePathname()
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [expanded, setExpanded] = useState<string | null>(null)

  // Close the drawer on navigation, otherwise it stays open over the new page.
  useEffect(() => {
    setDrawerOpen(false)
    setExpanded(null)
  }, [pathname])

  // The drawer is a full-screen overlay, so stop the page behind it scrolling.
  useEffect(() => {
    if (!drawerOpen) return
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = previous
    }
  }, [drawerOpen])

  useEffect(() => {
    function handleEsc(event: KeyboardEvent) {
      if (event.key === 'Escape') setDrawerOpen(false)
    }
    document.addEventListener('keydown', handleEsc)
    return () => document.removeEventListener('keydown', handleEsc)
  }, [])

  return (
    <>
      <nav className="site-nav">
        {NAV_ITEMS.map((item) => (
          <DesktopItem key={item.label} item={item} pathname={pathname} />
        ))}
        <span className="site-nav-ctas">
          {NAV_CTAS.map((cta) => (
            <NavLink key={cta.label} item={cta} className="nav-cta" />
          ))}
        </span>
      </nav>

      <button
        type="button"
        className="icon-button nav-burger"
        aria-label="Ouvrir le menu"
        aria-expanded={drawerOpen}
        onClick={() => setDrawerOpen(true)}
      >
        <Menu size={22} />
      </button>

      {drawerOpen ? (
        <div className="nav-drawer" role="dialog" aria-modal="true" aria-label="Menu">
          <div className="nav-drawer-head">
            {/* The lockup rather than the word "Menu": the drawer covers
                the header, so this keeps the brand on screen and gives a
                way back to the shop. Rendered directly instead of reusing
                BrandLockup, which lives in boutique.tsx — that module
                imports this one, so the reverse would be circular. */}
            <Link href="/boutique" onClick={() => setDrawerOpen(false)}>
              <Image
                className="nav-drawer-logo"
                src="/Vorwerk_TM_OD_horizontal_M_RGB.png"
                alt="Thermomix by Vorwerk — Official Distributor"
                width={3911}
                height={757}
                sizes="180px"
              />
            </Link>
            <button
              type="button"
              className="icon-button"
              aria-label="Fermer le menu"
              onClick={() => setDrawerOpen(false)}
            >
              <X size={22} />
            </button>
          </div>

          <div className="nav-drawer-body">
            {/* The header hides its search button at this width to give the
                brand lockup room, so the drawer carries it instead. */}
            {onSearch ? (
              <button
                type="button"
                className="nav-drawer-search"
                onClick={() => {
                  setDrawerOpen(false)
                  onSearch()
                }}
              >
                <Search size={17} /> Rechercher un produit
              </button>
            ) : null}

            {NAV_ITEMS.map((item) =>
              item.children ? (
                <div key={item.label} className="nav-drawer-group">
                  <button
                    type="button"
                    className="nav-drawer-trigger"
                    aria-expanded={expanded === item.label}
                    onClick={() =>
                      setExpanded((current) => (current === item.label ? null : item.label))
                    }
                  >
                    {item.label}
                    <ChevronDown
                      size={16}
                      className={expanded === item.label ? 'rotated' : undefined}
                    />
                  </button>
                  {expanded === item.label ? (
                    <div className="nav-drawer-children">
                      {item.children.map((child) => (
                        <NavLink
                          key={child.label}
                          item={child}
                          className="nav-drawer-child"
                          onClick={() => setDrawerOpen(false)}
                        />
                      ))}
                    </div>
                  ) : null}
                </div>
              ) : (
                <NavLink
                  key={item.label}
                  item={item}
                  className={`nav-drawer-link ${isActive(item, pathname) ? 'active' : ''}`}
                  onClick={() => setDrawerOpen(false)}
                />
              ),
            )}

            <div className="nav-drawer-ctas">
              {NAV_CTAS.map((cta) => (
                <NavLink
                  key={cta.label}
                  item={cta}
                  className="nav-cta full"
                  onClick={() => setDrawerOpen(false)}
                />
              ))}
            </div>
          </div>
        </div>
      ) : null}
    </>
  )
}
