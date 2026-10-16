/**
 * Shared skeleton for every page under the advisor shell — the same job
 * the admin's loading.tsx does for /admin-r, which this area never got.
 *
 * The espace group is force-dynamic and each page runs its own queries
 * behind requireAdvisorPage(), so without this the previous page stayed
 * on screen until the new one was completely ready and every click read
 * as a freeze.
 *
 * Generic on purpose: the shell — sidebar, header — lives in the layout
 * and does not move, so this stands in only for the page body, and the
 * advisor pages are all a heading above either stat cards or a table.
 */
export default function ConseillerLoading() {
  return (
    <div className="admin-page" aria-busy="true" aria-label="Chargement">
      <span
        className="skeleton skeleton-text"
        style={{ width: 208, height: 26, margin: '0 0 28px' }}
      />

      <div className="admin-stat-grid advisor-stat-grid-4">
        {[0, 1, 2, 3].map((card) => (
          <div className="admin-stat-card" key={card}>
            <span className="skeleton" style={{ width: 20, height: 20, borderRadius: 6 }} />
            <span className="skeleton skeleton-text" style={{ width: 44, height: 22 }} />
            <span className="skeleton skeleton-text" style={{ width: '80%', height: 11 }} />
          </div>
        ))}
      </div>

      <div className="admin-table-scroll">
        <div style={{ display: 'grid', gap: 12 }}>
          {[0, 1, 2, 3, 4, 5].map((row) => (
            <span key={row} className="skeleton" style={{ height: 44, borderRadius: 8 }} />
          ))}
        </div>
      </div>
    </div>
  )
}
