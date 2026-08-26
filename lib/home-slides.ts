/**
 * Home carousel slides, in order.
 *
 * ─── HOW TO EDIT ──────────────────────────────────────────────────────
 * Drop your images in `public/slides/` and point `image` at them, e.g.
 * '/slides/tm7.jpg'. Change `href` to wherever the slide should lead —
 * an internal path like '/boutique/thermomix-tm7', or a full external
 * URL. `alt` is read aloud by screen readers and shown if the image
 * fails, so describe the picture rather than repeating the link.
 *
 * Add or remove entries freely: the carousel counts them at render time,
 * and hides its arrows and dots when there is only one.
 * ──────────────────────────────────────────────────────────────────────
 */

export type HomeSlide = {
  image: string
  alt: string
  href: string
}

export const HOME_SLIDES: HomeSlide[] = [
  {
    image: '/slides/int_master-en_thermomix_tm7-launch_Functionality_Photos_Lifestyle_0131_16x9.webp',
    alt: 'Le Thermomix® TM7 en cuisine',
    href: '/boutique/thermomix-tm7',
  },
  {
    image: '/slides/int_master-en_thermomix_tm7-launch_Functionality_Photos_Lifestyle_0909_16x9.webp',
    alt: 'Préparer un repas avec le Thermomix® TM7',
    href: '/boutique/thermomix-tm7',
  },
  {
    image: '/slides/Banner-image-experience.webp',
    alt: "Vivre l'expérience Thermomix®",
    href: 'https://tunisia.vorwerk-thermomix.com/experience/',
  },
]

/** How long each slide holds before advancing, in milliseconds. */
export const SLIDE_INTERVAL = 2000
