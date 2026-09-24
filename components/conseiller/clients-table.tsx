'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { Search } from 'lucide-react'
import { SEXE_LABELS, type ClientListItem } from '@/lib/conseiller/format'

type Tab = 'tous' | 'clients' | 'prospects'

/**
 * Clients and prospects list (C3 for an advisor, C6 for the admin).
 * `renderExtra` lets the admin add a reassignment control per row
 * without this table knowing about admin actions.
 */
export function ClientsTable({
  clients,
  hrefBase,
  showAdvisor = false,
  renderExtra,
}: {
  clients: ClientListItem[]
  hrefBase?: string
  showAdvisor?: boolean
  renderExtra?: (client: ClientListItem) => React.ReactNode
}) {
  const [tab, setTab] = useState<Tab>('tous')
  const [query, setQuery] = useState('')

  const counts = useMemo(
    () => ({
      tous: clients.length,
      clients: clients.filter((client) => client.isClient).length,
      prospects: clients.filter((client) => !client.isClient).length,
    }),
    [clients],
  )

  const visible = useMemo(() => {
    const term = query.trim().toLowerCase()
    return clients.filter((client) => {
      if (tab === 'clients' && !client.isClient) return false
      if (tab === 'prospects' && client.isClient) return false
      if (!term) return true
      return [client.prenom, client.nom, client.telephone, client.email ?? '', client.ville, client.advisorName]
        .join(' ')
        .toLowerCase()
        .includes(term)
    })
  }, [clients, tab, query])

  const labels: Record<Tab, string> = { tous: 'Tous', clients: 'Clients', prospects: 'Prospects' }

  return (
    <div>
      <div className="admin-filter-row">
        <div className="admin-tabs">
          {(Object.keys(labels) as Tab[]).map((t) => (
            <button
              key={t}
              type="button"
              className={t === tab ? 'admin-tab active' : 'admin-tab'}
              onClick={() => setTab(t)}
            >
              {labels[t]} <span className="admin-tab-count">{counts[t]}</span>
            </button>
          ))}
        </div>
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
                <th>Ville</th>
                <th>Âge / sexe</th>
                <th>Type</th>
                {showAdvisor ? <th>Conseiller</th> : null}
                {renderExtra ? <th>Réattribuer</th> : null}
              </tr>
            </thead>
            <tbody>
              {visible.map((client) => (
                <tr key={client.id}>
                  <td>
                    {hrefBase ? (
                      <Link href={`${hrefBase}/${client.id}`} className="admin-table-link">
                        {client.prenom} {client.nom}
                      </Link>
                    ) : (
                      `${client.prenom} ${client.nom}`
                    )}
                  </td>
                  <td>
                    <a href={`tel:${client.telephone}`}>{client.telephone}</a>
                  </td>
                  <td>{[client.ville, client.gouvernorat].filter(Boolean).join(', ')}</td>
                  <td>
                    {[client.age ? `${client.age} ans` : null, client.sexe ? SEXE_LABELS[client.sexe] : null]
                      .filter(Boolean)
                      .join(' · ') || <span className="admin-muted">—</span>}
                  </td>
                  <td>
                    <span className={`admin-badge ${client.isClient ? 'badge-green' : 'badge-gray'}`}>
                      {client.isClient ? 'Client' : 'Prospect'}
                    </span>
                  </td>
                  {showAdvisor ? <td>{client.advisorName}</td> : null}
                  {renderExtra ? <td>{renderExtra(client)}</td> : null}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
