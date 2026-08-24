/**
 * Top navigation, mirroring tunisia.vorwerk-thermomix.com.
 *
 * Everything points back at the Vorwerk Tunisia site except "Produits" and
 * "Boutique": this repo IS the boutique, so those stay local. The original
 * sends Boutique to a /coming-soon/ placeholder that existed only because
 * the shop hadn't been built yet.
 *
 * External URLs are absolute; internal ones start with '/'. The nav uses
 * that distinction to decide between next/link and a plain anchor with
 * target="_blank", so nothing has to be flagged by hand.
 */

const SITE = 'https://tunisia.vorwerk-thermomix.com'

export type NavChild = { label: string; href: string }

export type NavItem = {
  label: string
  href: string
  /** Mega-menu tiles. A item with children opens a dropdown on desktop. */
  children?: NavChild[]
}

export const NAV_ITEMS: NavItem[] = [
  {
    label: 'Produits',
    href: '/boutique',
    children: [
      { label: 'Thermomix® TM7', href: `${SITE}/tm7-product/` },
      { label: 'Accessoires', href: '/boutique' },
      { label: 'Offres spéciales', href: `${SITE}/special-offers/` },
    ],
  },
  {
    label: 'Expérience',
    href: `${SITE}/experience/`,
    children: [
      { label: 'Expérience', href: `${SITE}/experience/` },
      { label: 'Achat', href: `${SITE}/purchase/` },
      { label: 'Contactez-nous', href: `${SITE}/contact-us/` },
      { label: 'Où nous trouver', href: `${SITE}/store-locator/` },
    ],
  },
  {
    label: 'Recettes et idées',
    href: `${SITE}/recipes/`,
    children: [
      { label: 'Cookidoo®', href: `${SITE}/cookidoo/` },
      { label: 'Livres de cuisine', href: `${SITE}/cookbooks/` },
      { label: 'Recettes', href: `${SITE}/recipes/` },
      { label: 'Communauté', href: `${SITE}/community/` },
    ],
  },
  { label: 'Blog', href: `${SITE}/coming-soon/` },
  { label: 'Boutique', href: '/boutique' },
  { label: 'Assistance', href: 'https://globalsupport.vorwerk.com/hc/fr' },
]

/** The two outlined calls to action sitting after the links. */
export const NAV_CTAS: NavChild[] = [
  { label: 'Réserver une démonstration', href: `${SITE}/thermomix-book-a-demo/` },
  { label: 'Rejoignez-nous', href: `${SITE}/thermomix-join-us/` },
]

export function isExternal(href: string): boolean {
  return !href.startsWith('/')
}
