import { BoutiqueShell } from '@/components/boutique-shell'

/**
 * Shown the moment "Passer la commande" is clicked, while the server
 * confirms the session and loads the prefill. Without it the browser sat
 * on the cart page for the whole round-trip with no feedback, which read
 * as a dead button — see the note on parallel loading in page.tsx.
 *
 * Mirrors the two-column checkout layout so the real form swaps in
 * without the page jumping.
 */
export default function CheckoutLoading() {
  return (
    <BoutiqueShell>
      <section className="checkout-page" aria-busy="true" aria-label="Chargement du paiement">
        <span className="skeleton skeleton-text" style={{ width: 132, height: 13 }} />
        <span
          className="skeleton skeleton-text"
          style={{ width: 218, height: 12, margin: '26px 0 14px' }}
        />
        <span
          className="skeleton skeleton-text"
          style={{ width: 'min(420px, 80%)', height: 46, marginBottom: 50 }}
        />

        <div className="cart-layout">
          <div className="checkout-form">
            <span className="skeleton skeleton-text" style={{ width: 168, height: 17 }} />

            {/* Delivery-method cards, then the two field groups. */}
            <div className="payment-options" style={{ marginTop: 25 }}>
              <span className="skeleton" style={{ height: 82, borderRadius: 12 }} />
              <span className="skeleton" style={{ height: 82, borderRadius: 12 }} />
            </div>

            {[0, 1].map((group) => (
              <div key={group}>
                <span
                  className="skeleton skeleton-text"
                  style={{ width: 196, height: 17, margin: '45px 0 25px' }}
                />
                <div style={{ display: 'grid', gap: 16 }}>
                  {[0, 1, 2, 3].map((field) => (
                    <span key={field} className="skeleton" style={{ height: 44, borderRadius: 8 }} />
                  ))}
                </div>
              </div>
            ))}
          </div>

          <div className="checkout-submit">
            <span className="skeleton" style={{ height: 48, borderRadius: 999 }} />
          </div>

          <aside className="summary">
            <span
              className="skeleton skeleton-text"
              style={{ width: 148, height: 17, marginBottom: 25 }}
            />
            {[0, 1].map((line) => (
              <div key={line}>
                <span className="skeleton skeleton-text" style={{ width: 128, height: 12 }} />
                <span className="skeleton skeleton-text" style={{ width: 68, height: 12 }} />
              </div>
            ))}
            <hr />
            <div className="summary-total">
              <span className="skeleton skeleton-text" style={{ width: 84, height: 15 }} />
              <span className="skeleton skeleton-text" style={{ width: 92, height: 15 }} />
            </div>
          </aside>
        </div>
      </section>
    </BoutiqueShell>
  )
}
