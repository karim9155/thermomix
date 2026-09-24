import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { requireAdvisorPage } from '@/lib/conseiller/guard'
import { ClientForm, EMPTY_CLIENT } from '@/components/conseiller/client-form'

export const metadata = { title: 'Nouveau client' }

export default async function NouveauClientPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>
}) {
  await requireAdvisorPage()
  const { next } = await searchParams
  const fromOrderForm = next === 'vente'

  return (
    <div className="admin-page advisor-narrow-page">
      <Link
        href={fromOrderForm ? '/conseiller/ventes/nouveau' : '/conseiller/clients'}
        className="back-link"
      >
        <ArrowLeft size={16} /> {fromOrderForm ? 'Retour au bon de commande' : 'Retour à mes clients'}
      </Link>
      <h1>Nouveau client</h1>
      <section className="admin-card">
        <ClientForm defaults={EMPTY_CLIENT} next={fromOrderForm ? 'vente' : undefined} />
      </section>
    </div>
  )
}
