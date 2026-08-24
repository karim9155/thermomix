import type { Metadata } from 'next'
import { LogOut } from 'lucide-react'
import { requireCustomer } from '@/lib/compte/guard'
import { signout } from '@/app/compte/actions'

export const metadata: Metadata = {
  title: 'Mon compte — INOCASA',
  robots: { index: false, follow: false },
}

export default async function ComptePage() {
  const customer = await requireCustomer('/compte')

  return (
    <div className="compte-page">
      <div className="compte-heading">
        <div>
          <p className="eyebrow">INOCASA</p>
          <h1>Mon compte</h1>
          <p className="compte-email">{customer.email}</p>
        </div>
        <form action={signout}>
          <button type="submit" className="outline-button">
            <LogOut size={15} /> Se déconnecter
          </button>
        </form>
      </div>

      <section className="compte-section">
        <h2>Mes commandes</h2>
        <p className="compte-empty">Vos commandes apparaîtront ici.</p>
      </section>
    </div>
  )
}
