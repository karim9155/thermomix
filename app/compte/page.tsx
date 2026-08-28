import type { Metadata } from 'next'
import Link from 'next/link'
import { ArrowRight, LogOut, Package } from 'lucide-react'
import { requireCustomer } from '@/lib/compte/guard'
import { listCustomerOrders } from '@/lib/compte/orders'
import { getProfile, EMPTY_PROFILE } from '@/lib/compte/profile'
import { signout } from '@/app/compte/actions'
import { ProfileForm } from '@/components/compte/profile-form'
import { DeliveryStatusBadge } from '@/components/admin/badges'
import { formatEstimatedDelivery } from '@/lib/admin/order-format'
import { formatPrice } from '@/lib/product-format'

export const metadata: Metadata = {
  title: 'Mon compte — INOCASA',
  robots: { index: false, follow: false },
}

const dateFormatter = new Intl.DateTimeFormat('fr-TN', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
})

export default async function ComptePage({
  searchParams,
}: {
  searchParams: Promise<{ onglet?: string }>
}) {
  const { onglet } = await searchParams

  // Tab state lives in the URL so it survives a reload and can be linked
  // to — and so the server only loads the data the active tab needs.
  const tab = onglet === 'profil' ? 'profil' : 'commandes'

  // The guard and the tab's data run together rather than in sequence.
  // Both hit Supabase over the network, and awaiting the guard first made
  // the page cost two serial round-trips before any HTML could stream.
  //
  // Starting the read before the session is confirmed is safe here and
  // only here: these queries go through the customer's own session, so
  // migration 0006's RLS policies scope them to that customer's rows. A
  // request with no valid session reads nothing rather than someone
  // else's data, and requireCustomer() still redirects it away before any
  // of it is rendered. Do NOT copy this shape onto a service-role client,
  // which bypasses RLS and genuinely does need the guard to land first.
  //
  // They are kicked off together but awaited guard-first, not via a bare
  // Promise.all: listCustomerOrders() throws on a database error and
  // redirect() also works by throwing, so Promise.all could let a query
  // failure win the race and surface a 500 where a signed-out visitor
  // should simply have been sent to the login page.
  const customerPromise = requireCustomer('/compte')
  const ordersPromise = tab === 'commandes' ? listCustomerOrders() : Promise.resolve([])
  const profilePromise = tab === 'profil' ? getProfile() : Promise.resolve(undefined)

  // Nothing is awaiting these yet, and an unhandled rejection between now
  // and the awaits below would be fatal in Node. A no-op catch marks them
  // as handled; the real error still arrives at the await.
  ordersPromise.catch(() => {})
  profilePromise.catch(() => {})

  const customer = await customerPromise
  const orders = await ordersPromise
  const loadedProfile = await profilePromise

  const profile =
    tab === 'profil'
      ? (loadedProfile ?? {
          ...EMPTY_PROFILE,
          prenom: customer.prenom,
          nom: customer.nom,
        })
      : EMPTY_PROFILE

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

      <nav className="compte-tabs">
        <Link
          href="/compte"
          className={tab === 'commandes' ? 'compte-tab active' : 'compte-tab'}
        >
          Mes commandes
        </Link>
        <Link
          href="/compte?onglet=profil"
          className={tab === 'profil' ? 'compte-tab active' : 'compte-tab'}
        >
          Profil
        </Link>
      </nav>

      {tab === 'profil' ? (
        <section className="compte-section">
          <h2>Mes informations</h2>
          <p className="compte-profile-intro">
            Ces informations préremplissent votre prochaine commande. Vos commandes déjà passées
            gardent l&apos;adresse utilisée dans le passé.
          </p>
          <ProfileForm profile={profile} email={customer.email} />
        </section>
      ) : (
      <section className="compte-section">
        <h2>Mes commandes</h2>

        {orders.length === 0 ? (
          <div className="compte-empty-state">
            <Package size={26} />
            <p>Vous n&apos;avez pas encore passé de commande.</p>
            <Link href="/boutique" className="primary-button">
              Découvrir la boutique <ArrowRight size={16} />
            </Link>
          </div>
        ) : (
          <ul className="compte-order-list">
            {orders.map((order) => (
              <li key={order.reference}>
                <Link href={`/compte/commandes/${order.reference}`} className="compte-order-card">
                  <div className="compte-order-main">
                    <strong>{order.reference}</strong>
                    <span>{dateFormatter.format(new Date(order.createdAt))}</span>
                  </div>

                  <div className="compte-order-status">
                    <DeliveryStatusBadge status={order.deliveryStatus} />
                    {formatEstimatedDelivery(order.estimatedDelivery) ? (
                      <span className="compte-order-estimate">
                        Livraison estimée : {formatEstimatedDelivery(order.estimatedDelivery)}
                      </span>
                    ) : null}
                  </div>

                  <div className="compte-order-total">
                    <strong>{formatPrice(order.totalTTC)}</strong>
                    <ArrowRight size={16} />
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
      )}
    </div>
  )
}
