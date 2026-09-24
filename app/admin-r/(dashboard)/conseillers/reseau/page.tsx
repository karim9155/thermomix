import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { buildTree, listAdvisors } from '@/lib/conseiller/network'
import { NetworkTree } from '@/components/conseiller/network-tree'

export const metadata = { title: 'Organigramme' }

export default async function ReseauPage() {
  const advisors = await listAdvisors()
  const roots = buildTree(advisors)

  return (
    <div className="admin-page">
      <Link href="/admin-r/conseillers" className="back-link">
        <ArrowLeft size={16} /> Retour aux conseillers
      </Link>
      <h1>Organigramme du réseau</h1>
      <section className="admin-card">
        <NetworkTree roots={roots} />
      </section>
    </div>
  )
}
