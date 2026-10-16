'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { Search } from 'lucide-react'
import type { AdvisorListItem } from '@/lib/conseiller/network'
import { ADVISOR_STATUSES, dateFormatter, type AdvisorStatus } from '@/lib/conseiller/format'
import { AdvisorStatusBadge } from '@/components/conseiller/badges'

type Tab = 'tous' | AdvisorStatus

const TAB_LABELS: Record<Tab, string> = {
  tous: 'Tous',
  actif: 'Actifs',
  invite: 'Invités',
  suspendu: 'Suspendus',
}

const TABS: Tab[] = ['tous', ...ADVISOR_STATUSES]

export function AdvisorsTable({ advisors }: { advisors: AdvisorListItem[] }) {
  const [tab, setTab] = useState<Tab>('tous')
  const [query, setQuery] = useState('')

  const counts = useMemo(() => {
    const counts: Record<Tab, number> = { tous: advisors.length, actif: 0, invite: 0, suspendu: 0 }
    for (const advisor of advisors) counts[advisor.status]++
    return counts
  }, [advisors])

  const visible = useMemo(() => {
    const term = query.trim().toLowerCase()
    return advisors.filter((advisor) => {
      if (tab !== 'tous' && advisor.status !== tab) return false
      if (!term) return true
      return [
        advisor.matricule,
        advisor.prenom,
        advisor.nom,
        advisor.email,
        advisor.telephone,
        advisor.region,
      ]
        .join(' ')
        .toLowerCase()
        .includes(term)
    })
  }, [advisors, tab, query])

  return (
    <div>
      <div className="admin-filter-row">
        <div className="admin-tabs">
          {TABS.map((t) => (
            <button
              key={t}
              type="button"
              className={t === tab ? 'admin-tab active' : 'admin-tab'}
              onClick={() => setTab(t)}
            >
              {TAB_LABELS[t]} <span className="admin-tab-count">{counts[t]}</span>
            </button>
          ))}
        </div>
        <div className="admin-search">
          <Search size={16} />
          <input
            placeholder="Nom, email, téléphone ou région"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
        </div>
      </div>

      {visible.length === 0 ? (
        <p className="admin-empty">Aucun conseiller ne correspond.</p>
      ) : (
        <div className="admin-table-scroll">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Matricule</th>
                <th>Conseiller</th>
                <th>Téléphone</th>
                <th>Région</th>
                <th>Grade</th>
                <th>Parrain</th>
                <th>Recrues</th>
                <th>Statut</th>
                <th>Depuis</th>
              </tr>
            </thead>
            <tbody>
              {visible.map((advisor) => (
                <tr key={advisor.id}>
                  <td>{advisor.matricule}</td>
                  <td>
                    <Link
                      href={`/admin-r/conseillers/${advisor.id}`}
                      className="admin-table-link"
                    >
                      {advisor.prenom} {advisor.nom}
                    </Link>
                    <div className="admin-muted advisor-table-sub">{advisor.email}</div>
                  </td>
                  <td>{advisor.telephone}</td>
                  <td>{advisor.region}</td>
                  <td>{advisor.gradeName}</td>
                  <td>{advisor.sponsorName ?? <span className="admin-muted">Fondateur</span>}</td>
                  <td>{advisor.recruitCount}</td>
                  <td>
                    <AdvisorStatusBadge status={advisor.status} />
                  </td>
                  <td>{dateFormatter.format(new Date(advisor.createdAt))}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
