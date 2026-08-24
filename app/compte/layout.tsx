import { BoutiqueShell } from '@/components/boutique-shell'

// The customer area is part of the storefront, not a separate console like
// /admin-r — same header, cart and footer, so signing in doesn't feel like
// leaving the shop.
export const dynamic = 'force-dynamic'

export default function CompteLayout({ children }: { children: React.ReactNode }) {
  return <BoutiqueShell>{children}</BoutiqueShell>
}
