/**
 * Shared skeleton for every page under the admin shell.
 *
 * The dashboard group is force-dynamic and each page runs its own queries,
 * so navigating between Commandes / Produits / a delivery detail left the
 * previous page on screen with no feedback until the new one was fully
 * ready — every click read as a freeze. This gives the navigation an
 * immediate response.
 *
 * Deliberately generic (heading, stat row, table) rather than per-page:
 * the shell — sidebar, header — is in the layout and stays put, so this
 * only stands in for the page body, and all three pages are a heading
 * above a table.
 */
export default function AdminLoading() {
  return (
    <div className="admin-page" aria-busy="true" aria-label="Chargement">
      <span
        className="skeleton skeleton-text"
        style={{ width: 208, height: 26, margin: '0 0 28px' }}
      />

      <div className="admin-stat-grid">
        {[0, 1, 2, 3, 4, 5].map((card) => (
          <div className="admin-stat-card" key={card}>
            <span className="skeleton" style={{ width: 20, height: 20, borderRadius: 6 }} />
            <span className="skeleton skeleton-text" style={{ width: 44, height: 22 }} />
            <span className="skeleton skeleton-text" style={{ width: '80%', height: 11 }} />
          </div>
        ))}
      </div>

      <div className="admin-table-scroll">
        <div style={{ display: 'grid', gap: 12 }}>
          {[0, 1, 2, 3, 4, 5, 6, 7].map((row) => (
            <span key={row} className="skeleton" style={{ height: 44, borderRadius: 8 }} />
          ))}
        </div>
      </div>
    </div>
  )
}
