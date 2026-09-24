import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: {
    template: '%s | Espace conseiller INOCASA',
    default: 'Espace conseiller INOCASA',
  },
  robots: { index: false, follow: false },
}

export default function ConseillerLayout({ children }: { children: React.ReactNode }) {
  return children
}
