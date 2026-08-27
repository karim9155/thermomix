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

/** A mega-menu tile: a NavChild with the image its card shows. */
export type NavTile = NavChild & { image: string }

export type NavItem = {
  label: string
  href: string
  /** Mega-menu tiles. A item with children opens a dropdown on desktop. */
  children?: NavTile[]
}

export const NAV_ITEMS: NavItem[] = [
  {
    label: 'Produits',
    href: '/boutique',
    children: [
      { label: 'Thermomix® TM7', href: `${SITE}/tm7-product/`, image: '/nav/tm7.jpg' },
      { label: 'Accessoires', href: '/boutique', image: '/nav/accessoires.webp' },
      {
        label: 'Offres spéciales',
        href: `${SITE}/special-offers/`,
        image: '/nav/offres-speciales.webp',
      },
    ],
  },
  {
    label: 'Expérience',
    href: `${SITE}/experience/`,
    children: [
      { label: 'Expérience', href: `${SITE}/experience/`, image: '/nav/experience.webp' },
      { label: 'Achat', href: `${SITE}/purchase/`, image: '/nav/achat.webp' },
      { label: 'Contactez-nous', href: `${SITE}/contact-us/`, image: '/nav/contact.png' },
      {
        label: 'Où nous trouver',
        href: `${SITE}/store-locator/`,
        image: '/nav/ou-nous-trouver.webp',
      },
    ],
  },
  {
    label: 'Recettes et idées',
    href: `${SITE}/recipes/`,
    children: [
      { label: 'Cookidoo®', href: `${SITE}/cookidoo/`, image: '/nav/cookidoo.webp' },
      {
        label: 'Livres de cuisine',
        href: `${SITE}/cookbooks/`,
        image: '/nav/livres-de-cuisine.png',
      },
      { label: 'Recettes', href: `${SITE}/recipes/`, image: '/nav/recettes.webp' },
      { label: 'Communauté', href: `${SITE}/community/`, image: '/nav/communaute.png' },
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
