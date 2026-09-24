import Link from 'next/link'
import {
  Coins,
  Download,
  FileClock,
  Hourglass,
  MousePointerClick,
  Package,
  Presentation,
  ShoppingBag,
  TriangleAlert,
  UserPlus,
  Users,
  Wallet,
} from 'lucide-react'
import {
  getLeaderboard,
  getNetworkKpis,
  parsePeriod,
  statsByClientProfile,
  statsByRegion,
} from '@/lib/conseiller/stats'
import { todayInTunis } from '@/lib/conseiller/sales'
import { formatAmount } from '@/lib/conseiller/format'
import { formatDay } from '@/components/conseiller/sale-summary'
import { PeriodPicker } from '@/components/conseiller/period-picker'
import { BarList } from '@/components/conseiller/bar-list'
import { AutoRefresh } from '@/components/admin/auto-refresh'

export const metadata = { title: 'Statistiques du réseau' }

export default async function StatistiquesPage({
  searchParams,
}: {
  searchParams: Promise<{ du?: string; au?: string }>
}) {
  const today = todayInTunis()
  const period = parsePeriod(await searchParams, today)

  const [kpis, leaderboard, profile] = await Promise.all([
    getNetworkKpis(period, today),
    getLeaderboard(period),
    statsByClientProfile(period, today),
  ])
  const regions = statsByRegion(leaderboard)
  const query = `du=${period.from}&au=${period.to}`
  const exportHref = (type: string) => `/admin-r/statistiques/export?type=${type}&${query}`

  return (
    <div className="admin-page">
      <div className="admin-section-heading">
        <h1>Statistiques du réseau</h1>
        <AutoRefresh />
      </div>

      <PeriodPicker period={period} today={today} basePath="/admin-r/statistiques" />
      <p className="admin-muted advisor-help">
        Du {formatDay(period.from)} au {formatDay(period.to)}. Une vente compte le jour où elle est
        entièrement payée ; le chiffre d&apos;affaires est le total produits TTC (hors frais).
      </p>

      <div className="admin-stat-grid stats-kpis">
        <div className="admin-stat-card">
          <Wallet size={20} />
          <strong>{formatAmount(kpis.revenue)}</strong>
          <span>Chiffre d&apos;affaires</span>
        </div>
        <div className="admin-stat-card">
          <ShoppingBag size={20} />
          <strong>{kpis.sales}</strong>
          <span>Ventes payées</span>
        </div>
        <div className="admin-stat-card">
          <Package size={20} />
          <strong>{kpis.robots}</strong>
          <span>Thermomix vendus</span>
        </div>
        <div className="admin-stat-card">
          <Coins size={20} />
          <strong>{formatAmount(kpis.commissions)}</strong>
          <span>Primes générées</span>
        </div>
        <div className="admin-stat-card">
          <Users size={20} />
          <strong>{kpis.activeAdvisors}</strong>
          <span>
            Conseillers actifs{kpis.invitedAdvisors > 0 ? ` (+${kpis.invitedAdvisors} invités)` : ''}
          </span>
        </div>
        <div className="admin-stat-card">
          <UserPlus size={20} />
          <strong>{kpis.recruits}</strong>
          <span>Recrues activées</span>
        </div>
        <div className="admin-stat-card">
          <Presentation size={20} />
          <strong>{kpis.workshopsDone}</strong>
          <span>Ateliers effectués</span>
        </div>
        <div className="admin-stat-card">
          <MousePointerClick size={20} />
          <strong>{kpis.clicks}</strong>
          <span>Clics sur les liens · {kpis.newClients} nouveaux clients</span>
        </div>
      </div>

      <h2 className="stats-subtitle">En ce moment</h2>
      <div className="admin-stat-grid advisor-stat-grid">
        <Link href="/admin-r/bons-de-commande" className="admin-stat-card stats-link-card">
          <FileClock size={20} />
          <strong>{kpis.toInvoice}</strong>
          <span>Bons de commande à valider</span>
        </Link>
        <div className="admin-stat-card">
          <Hourglass size={20} />
          <strong>{formatAmount(kpis.outstanding)}</strong>
          <span>Reste à encaisser sur les ventes en cours</span>
        </div>
        <Link href="/admin-r/bons-de-commande" className="admin-stat-card stats-link-card">
          <TriangleAlert size={20} />
          <strong>{kpis.lateInstallments}</strong>
          <span>Tranches en retard</span>
        </Link>
      </div>

      <section className="admin-section">
        <div className="admin-section-heading">
          <h2>Classement des conseillers</h2>
          <a href={exportHref('classement')} className="outline-button advisor-small-button">
            <Download size={14} /> CSV
          </a>
        </div>
        {leaderboard.length === 0 ? (
          <p className="admin-empty">Aucun conseiller actif.</p>
        ) : (
          <div className="admin-table-scroll">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Rang</th>
                  <th>Conseiller</th>
                  <th>Région</th>
                  <th>Grade</th>
                  <th className="advisor-num">Ventes</th>
                  <th className="advisor-num">Thermomix</th>
                  <th className="advisor-num">Chiffre d&apos;affaires</th>
                  <th className="advisor-num">Recrues</th>
                  <th className="advisor-num">Primes</th>
                </tr>
              </thead>
              <tbody>
                {leaderboard.map((row, index) => (
                  <tr key={row.advisorId}>
                    <td>{index + 1}</td>
                    <td>
                      <Link href={`/admin-r/conseillers/${row.advisorId}`} className="admin-table-link">
                        {row.name}
                      </Link>
                    </td>
                    <td>{row.region}</td>
                    <td>{row.grade}</td>
                    <td className="advisor-num">{row.sales}</td>
                    <td className="advisor-num">{row.robots}</td>
                    <td className="advisor-num">{formatAmount(row.revenue)}</td>
                    <td className="advisor-num">{row.recruits}</td>
                    <td className="advisor-num">{formatAmount(row.commissions)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="admin-section">
        <div className="admin-section-heading">
          <h2>Chiffre d&apos;affaires par région du conseiller</h2>
          <a href={exportHref('regions')} className="outline-button advisor-small-button">
            <Download size={14} /> CSV
          </a>
        </div>
        <div className="admin-card">
          <BarList
            rows={regions.map((row) => ({ label: row.region, value: row.revenue }))}
            valueLabel="Chiffre d'affaires"
            format={formatAmount}
            detail={(index) =>
              `${regions[index].sales} vente(s) · ${regions[index].advisors} conseiller(s) actif(s)`
            }
          />
        </div>
      </section>

      <section className="admin-section">
        <div className="admin-section-heading">
          <h2>Ventes par profil client</h2>
          <a href={exportHref('profils')} className="outline-button advisor-small-button">
            <Download size={14} /> CSV
          </a>
        </div>
        <p className="admin-muted advisor-help">
          {profile.total} vente(s) conseiller payée(s) sur la période. Les commandes en ligne n&apos;ont
          pas de fiche client avec l&apos;âge et le sexe et ne sont donc pas comptées ici.
        </p>
        <div className="advisor-two-columns stats-profile">
          <div className="admin-card">
            <h3 className="advisor-subheading advisor-subheading-flush">Ventes par âge</h3>
            <BarList
              rows={profile.byAge.map((row) => ({ label: row.label, value: row.sales }))}
              valueLabel="Ventes"
              detail={(index) => formatAmount(profile.byAge[index].revenue)}
            />
          </div>
          <div className="admin-card">
            <h3 className="advisor-subheading advisor-subheading-flush">Ventes par sexe</h3>
            <BarList
              rows={profile.bySex.map((row) => ({ label: row.label, value: row.sales }))}
              valueLabel="Ventes"
              detail={(index) => formatAmount(profile.bySex[index].revenue)}
            />
          </div>
        </div>
      </section>
    </div>
  )
}
