import Link from 'next/link'
import { Activity, ArrowUpCircle, Award, Inbox, Network, UserPlus } from 'lucide-react'
import { countPendingApplications, listAdvisors } from '@/lib/conseiller/network'
import { AdvisorsTable } from '@/components/admin/advisors-table'

export const metadata = { title: 'Conseillers' }

export default async function ConseillersPage() {
  const [advisors, pending] = await Promise.all([listAdvisors(), countPendingApplications()])

  return (
    <div className="admin-page">
      <div className="admin-section-heading">
        <h1>Conseillers</h1>
        <Link href="/admin-r/conseillers/nouveau" className="primary-button">
          <UserPlus size={17} /> Nouveau conseiller
        </Link>
      </div>

      <nav className="advisor-subnav">
        <Link href="/admin-r/conseillers/candidatures" className="admin-tab">
          <Inbox size={14} /> Candidatures
          {pending > 0 ? <span className="admin-tab-count advisor-pending-count">{pending}</span> : null}
        </Link>
        <Link href="/admin-r/conseillers/reseau" className="admin-tab">
          <Network size={14} /> Organigramme
        </Link>
        <Link href="/admin-r/conseillers/activite" className="admin-tab">
          <Activity size={14} /> Activité
        </Link>
        <Link href="/admin-r/conseillers/grades" className="admin-tab">
          <Award size={14} /> Grades
        </Link>
        <Link href="/admin-r/conseillers/promotions" className="admin-tab">
          <ArrowUpCircle size={14} /> Promotions proposées
        </Link>
      </nav>

      <AdvisorsTable advisors={advisors} />
    </div>
  )
}
