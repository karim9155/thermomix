import 'server-only'
import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer'
import type { CustomerOrderDetail } from '@/lib/compte/orders'

/**
 * Invoice layout. Rendered to a PDF stream server-side (see the facture
 * route) — never in the browser, so an invoice can only be produced for
 * an order the server has already confirmed the caller owns.
 *
 * Money is formatted to three decimals here rather than reusing
 * formatPrice() from lib/product-format: that one rounds to whole dinars
 * for storefront display, which is fine for a price tag and wrong for an
 * invoice, where the millimes have to add up.
 */

const TVA_RATE = 0.19

function money(value: number): string {
  return `${value.toFixed(3)} TND`
}

const dateFormatter = new Intl.DateTimeFormat('fr-TN', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
})

const styles = StyleSheet.create({
  page: { padding: 44, fontSize: 10, color: '#1f2328', fontFamily: 'Helvetica' },
  header: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 28 },
  brand: { fontSize: 18, fontWeight: 'bold', letterSpacing: 1 },
  brandSub: { fontSize: 9, color: '#6b7280', marginTop: 3 },
  sellerLine: { fontSize: 9, color: '#6b7280', marginTop: 2 },
  invoiceTitle: { fontSize: 15, fontWeight: 'bold', textAlign: 'right' },
  invoiceMeta: { fontSize: 9, color: '#6b7280', textAlign: 'right', marginTop: 4 },
  section: { marginBottom: 22 },
  sectionTitle: {
    fontSize: 8,
    color: '#6b7280',
    letterSpacing: 1,
    marginBottom: 6,
    textTransform: 'uppercase',
  },
  row: { flexDirection: 'row' },
  tableHead: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#1f2328',
    paddingBottom: 5,
    marginBottom: 2,
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    paddingVertical: 7,
  },
  th: { fontSize: 8, color: '#6b7280', letterSpacing: 0.5 },
  colName: { flex: 4 },
  colQty: { flex: 1, textAlign: 'right' },
  colUnit: { flex: 1.6, textAlign: 'right' },
  colTotal: { flex: 1.8, textAlign: 'right' },
  sku: { fontSize: 8, color: '#6b7280', marginTop: 2 },
  totals: { marginTop: 18, marginLeft: 'auto', width: 230 },
  totalsRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4 },
  totalsFinal: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 8,
    marginTop: 4,
    borderTopWidth: 1,
    borderTopColor: '#1f2328',
    fontSize: 12,
  },
  muted: { color: '#6b7280' },
  bold: { fontWeight: 'bold' },
  footer: {
    position: 'absolute',
    bottom: 34,
    left: 44,
    right: 44,
    fontSize: 8,
    color: '#6b7280',
    textAlign: 'center',
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    paddingTop: 10,
  },
})

export function InvoiceDocument({ order }: { order: CustomerOrderDetail }) {
  return (
    <Document
      title={`Facture ${order.reference} — INOCASA`}
      author="INOCASA"
      subject={`Facture de la commande ${order.reference}`}
    >
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <View>
            <Text style={styles.brand}>INOCASA</Text>
            <Text style={styles.brandSub}>Distributeur officiel Vorwerk Thermomix® en Tunisie</Text>
            <Text style={styles.sellerLine}>Avenue du Stade, La Marsa 2070, Tunisie</Text>
            <Text style={styles.sellerLine}>contact@inocasa.tn · +216 22 08 14 14</Text>
          </View>
          <View>
            <Text style={styles.invoiceTitle}>FACTURE</Text>
            <Text style={styles.invoiceMeta}>N° {order.reference}</Text>
            <Text style={styles.invoiceMeta}>
              {dateFormatter.format(new Date(order.createdAt))}
            </Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Facturé à</Text>
          <Text>
            {order.prenom} {order.nom}
          </Text>
          <Text style={styles.muted}>{order.adresse}</Text>
          <Text style={styles.muted}>
            {order.ville}, {order.gouvernorat}
          </Text>
          <Text style={styles.muted}>{order.telephone}</Text>
          {order.email ? <Text style={styles.muted}>{order.email}</Text> : null}
        </View>

        <View style={styles.section}>
          <View style={styles.tableHead}>
            <Text style={[styles.th, styles.colName]}>Désignation</Text>
            <Text style={[styles.th, styles.colQty]}>Qté</Text>
            <Text style={[styles.th, styles.colUnit]}>P.U. HT</Text>
            <Text style={[styles.th, styles.colTotal]}>Total HT</Text>
          </View>

          {order.items.map((item) => (
            <View style={styles.tableRow} key={item.sku} wrap={false}>
              <View style={styles.colName}>
                <Text>{item.name}</Text>
                <Text style={styles.sku}>Réf. {item.sku}</Text>
              </View>
              <Text style={styles.colQty}>{item.quantity}</Text>
              <Text style={styles.colUnit}>{money(item.priceHT)}</Text>
              <Text style={styles.colTotal}>{money(item.priceHT * item.quantity)}</Text>
            </View>
          ))}

          <View style={styles.totals}>
            <View style={styles.totalsRow}>
              <Text style={styles.muted}>Sous-total HT</Text>
              <Text>{money(order.subtotalHT)}</Text>
            </View>
            <View style={styles.totalsRow}>
              <Text style={styles.muted}>TVA {Math.round(TVA_RATE * 100)}%</Text>
              <Text>{money(order.totalTVA)}</Text>
            </View>
            <View style={styles.totalsFinal}>
              <Text style={styles.bold}>Total TTC</Text>
              <Text style={styles.bold}>{money(order.totalTTC)}</Text>
            </View>
          </View>
        </View>

        <Text style={styles.footer}>
          INOCASA — Distributeur officiel Vorwerk Thermomix® en Tunisie · contact@inocasa.tn ·
          +216 22 08 14 14 · Prix en dinars tunisiens, TVA 19% incluse dans le total TTC.
        </Text>
      </Page>
    </Document>
  )
}
