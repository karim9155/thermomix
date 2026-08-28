/**
 * Shown the instant the profile button is clicked, while the server
 * re-verifies the session and loads orders. Without this the browser holds
 * the previous page on screen for the whole round-trip and the click reads
 * as broken — see the note on parallel loading in page.tsx.
 *
 * The shape mirrors the signed-in "Mes commandes" tab, which is where the
 * header's account link always lands, so content swaps in without a jump.
 */
export default function CompteLoading() {
  return (
    <div className="compte-page" aria-busy="true" aria-label="Chargement de votre compte">
      <div className="compte-heading">
        <div>
          <span className="skeleton skeleton-text" style={{ width: 72, height: 11 }} />
          <span className="skeleton skeleton-text" style={{ width: 208, height: 30, margin: '10px 0 10px' }} />
          <span className="skeleton skeleton-text" style={{ width: 168, height: 13 }} />
        </div>
        <span className="skeleton" style={{ width: 148, height: 40, borderRadius: 999 }} />
      </div>

      <div className="compte-tabs">
        <span className="skeleton skeleton-text" style={{ width: 104, height: 14, margin: '12px 18px' }} />
        <span className="skeleton skeleton-text" style={{ width: 52, height: 14, margin: '12px 18px' }} />
      </div>

      <section className="compte-section">
        <span className="skeleton skeleton-text" style={{ width: 152, height: 19, marginBottom: 18 }} />

        <ul className="compte-order-list">
          {[0, 1, 2].map((row) => (
            <li key={row}>
              <div className="compte-order-card">
                <div className="compte-order-main">
                  <span className="skeleton skeleton-text" style={{ width: 116, height: 14 }} />
                  <span className="skeleton skeleton-text" style={{ width: 84, height: 12 }} />
                </div>
                <div className="compte-order-status">
                  <span className="skeleton" style={{ width: 92, height: 24, borderRadius: 999 }} />
                </div>
                <div className="compte-order-total">
                  <span className="skeleton skeleton-text" style={{ width: 76, height: 15 }} />
                </div>
              </div>
            </li>
          ))}
        </ul>
      </section>
    </div>
  )
}
