'use client'

import { useState, useTransition } from 'react'
import { reassignClientAction } from '@/app/admin-r/(dashboard)/clients/actions'
import { ClientsTable } from '@/components/conseiller/clients-table'
import type { ClientListItem } from '@/lib/conseiller/format'

/**
 * The admin's view of every client (C6), with a per-row reassignment
 * (C7). A client wrapper around ClientsTable because the reassign
 * control is a render function, which a Server Component can't pass.
 */
export function AdminClientsTable({
  clients,
  advisors,
}: {
  clients: ClientListItem[]
  advisors: { id: string; name: string; suspended: boolean }[]
}) {
  return (
    <ClientsTable
      clients={clients}
      showAdvisor
      renderExtra={(client) => <ReassignControl client={client} advisors={advisors} />}
    />
  )
}

function ReassignControl({
  client,
  advisors,
}: {
  client: ClientListItem
  advisors: { id: string; name: string; suspended: boolean }[]
}) {
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  function reassign(advisorId: string) {
    if (advisorId === client.advisorId) return
    const target = advisors.find((advisor) => advisor.id === advisorId)?.name ?? 'ce conseiller'
    if (!window.confirm(`Confier ${client.prenom} ${client.nom} à ${target} ?`)) return

    setError(null)
    startTransition(async () => {
      const result = await reassignClientAction(client.id, advisorId)
      if (result.error) setError(result.error)
    })
  }

  return (
    <div className="admin-status-control">
      <select value={client.advisorId} disabled={pending} onChange={(event) => reassign(event.target.value)}>
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
