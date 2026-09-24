import type { Product } from '@/lib/product-format'
import type { ClientListItem } from '@/lib/conseiller/format'
import type {
  EditorClient,
  EditorProduct,
  EditorWorkshop,
} from '@/components/conseiller/order-form-editor'
import { dateFormatter } from '@/lib/conseiller/format'

// Trims catalog and client records down to what the order-form editor
// needs, so the page doesn't ship full descriptions and image lists to
// the browser just to fill two dropdowns.

export function toEditorProducts(products: Product[]): EditorProduct[] {
  return products.map((product) => ({
    sku: product.sku,
    name: product.name,
    priceTTC: product.priceTTC,
    stockQuantity: product.stockQuantity,
  }))
}

export function toEditorClients(clients: ClientListItem[]): EditorClient[] {
  return clients
    .map((client) => ({
      id: client.id,
      name: `${client.prenom} ${client.nom} — ${client.telephone}`,
      hasAddress: client.hasAddress,
    }))
    .sort((a, b) => a.name.localeCompare(b.name, 'fr'))
}

export function toEditorWorkshops(
  workshops: { id: string; scheduledAt: string; label: string }[],
): EditorWorkshop[] {
  return workshops.map((workshop) => ({
    id: workshop.id,
    name: `Atelier du ${dateFormatter.format(new Date(workshop.scheduledAt))} — ${workshop.label}`,
  }))
}
