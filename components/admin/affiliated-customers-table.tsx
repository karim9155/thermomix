'use client'

import { useMemo, useState, useTransition } from 'react'
import { Search } from 'lucide-react'
import { reassignAffiliatedCustomerAction } from '@/app/admin-r/(dashboard)/clients/actions'
import type { AffiliatedCustomerItem } from '@/lib/conseiller/format'

/**
 * Customers who reached the shop through an advisor's link or code.
 * Separate from ClientsTable because these rows are accounts, not
 * clients rows: no age or sexe, and the reassignment writes the
 * customer's attribution rather than a client's owner.
 */
export function AffiliatedCustomersTable({
  customers,
  advisors,
}: {
  customers: AffiliatedCustomerItem[]
  advisors: { id: string; name: string; suspended: boolean }[]
}) {
  const [query, setQuery] = useState('')

  const visible = useMemo(() => {
    const term = query.trim().toLowerCase()
    if (!term) return customers
    return customers.filter((customer) =>
      [customer.prenom, customer.nom, customer.telephone, customer.email ?? '', customer.ville, customer.advisorName]
        .join(' ')
        .toLowerCase()
        .includes(term),
    )
  }, [customers, query])

  if (customers.length === 0) {
    return <p className="admin-empty">Aucun client affilié pour le moment.</p>
  }

  return (
    <div>
      <div className="admin-filter-row">
        <div className="admin-search">
          <Search size={16} />
          <input
            placeholder="Nom, téléphone, email ou ville"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
        </div>
      </div>

      {visible.length === 0 ? (
        <p className="admin-empty">Aucun client ne correspond.</p>
      ) : (
        <div className="admin-table-scroll">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Nom</th>
                <th>Téléphone</th>
                <th>Email</th>
                <th>Ville</th>
                <th>Origine</th>
                <th>Commandes</th>
                <th>Conseiller</th>
                <th>Réattribuer</th>
              </tr>
            </thead>
            <tbody>
              {visible.map((customer) => (
                <tr key={customer.userId}>
                  <td>{fullName(customer)}</td>
                  <td>
                    {customer.telephone ? (
                      <a href={`tel:${customer.telephone}`}>{customer.telephone}</a>
                    ) : (
                      <span className="admin-muted">—</span>
                    )}
                  </td>
                  <td>{customer.email ?? <span className="admin-muted">—</span>}</td>
                  <td>
                    {[customer.ville, customer.gouvernorat].filter(Boolean).join(', ') || (
                      <span className="admin-muted">—</span>
                    )}
                  </td>
                  <td>
                    <span className={`admin-badge ${customer.source === 'lien' ? 'badge-green' : 'badge-gray'}`}>
                      {customer.source === 'lien' ? 'Lien / code' : 'Admin'}
                    </span>
                  </td>
                  <td>
                    {customer.orders === 0 ? (
                      <span className="admin-muted">—</span>
                    ) : (
                      `${customer.orders} · ${customer.paidOrders} payée${customer.paidOrders > 1 ? 's' : ''}`
                    )}
                  </td>
                  <td>{customer.advisorName}</td>
                  <td>
                    <ReassignControl customer={customer} advisors={advisors} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

/** A customer attributed before filling anything in has no name yet. */
function fullName(customer: AffiliatedCustomerItem): React.ReactNode {
  const name = `${customer.prenom} ${customer.nom}`.trim()
  return name || <span className="admin-muted">Compte sans profil</span>
}

function ReassignControl({
  customer,
  advisors,
}: {
  customer: AffiliatedCustomerItem
  advisors: { id: string; name: string; suspended: boolean }[]
}) {
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  function reassign(advisorId: string) {
    if (advisorId === customer.advisorId) return
    const target = advisors.find((advisor) => advisor.id === advisorId)?.name ?? 'ce conseiller'
    const who = `${customer.prenom} ${customer.nom}`.trim() || 'ce client'
    // Spelled out because past orders — and their commissions — stay put.
    if (!window.confirm(`Confier les prochaines commandes de ${who} à ${target} ?`)) return

    setError(null)
    startTransition(async () => {
      const result = await reassignAffiliatedCustomerAction(customer.userId, advisorId)
      if (result.error) setError(result.error)
    })
  }

  return (
    <div className="admin-status-control">
      <select
        value={customer.advisorId}
        disabled={pending}
        onChange={(event) => reassign(event.target.value)}
      >
        {advisors.map((advisor) => (
          <option key={advisor.id} value={advisor.id} disabled={advisor.suspended}>
            {advisor.name}
            {advisor.suspended ? ' (suspendu)' : ''}
          </option>
        ))}
      </select>
      {error ? <p className="field-error">{error}</p> : null}
    </div>
  )
}
