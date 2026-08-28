import 'server-only'
import { createAdminClient } from '@/lib/supabase/admin'
import type { ProductFormValues } from '@/lib/admin/product-schema'
import type { ProductCategory } from '@/lib/product-format'

const BUCKET = 'product-images'

export type AdminProductImage = {
  id: string
  url: string
  alt: string | null
  position: number
}

export type AdminProductListItem = {
  id: string
  sku: string
  slug: string
  name: string
  category: ProductCategory
  priceTTC: number
  inStock: boolean
  stockQuantity: number
  isArchived: boolean
  imageCount: number
  heroImage: string | null
  sortOrder: number
}

export type AdminProductDetail = {
  id: string
  sku: string
  slug: string
  name: string
  category: ProductCategory
  priceHT: number
  tva: number
  priceTTC: number
  shortDescription: string
  description: string
  features: string[]
  included: string[]
  sourceUrl: string
  inStock: boolean
  stockQuantity: number
  isFeatured: boolean
  isArchived: boolean
  sortOrder: number
  images: AdminProductImage[]
}

function storagePathFromPublicUrl(url: string): string {
  const marker = `/storage/v1/object/public/${BUCKET}/`
  const idx = url.indexOf(marker)
  if (idx === -1) {
    throw new Error(`URL d'image inattendue (hors bucket ${BUCKET}) : ${url}`)
  }
  return decodeURIComponent(url.slice(idx + marker.length))
}

export async function listProductsAdmin(): Promise<AdminProductListItem[]> {
  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('products')
    .select(
      'id, sku, slug, name, category, price_ttc, in_stock, stock_quantity, is_archived, sort_order, product_images ( url, position )',
    )
    .order('sort_order', { ascending: true })

  if (error) {
    throw new Error(`Impossible de charger les produits : ${error.message}`)
  }

  return (data ?? []).map((row: any) => {
    const images = (row.product_images ?? []).slice().sort((a: any, b: any) => a.position - b.position)
    return {
      id: row.id,
      sku: row.sku,
      slug: row.slug,
      name: row.name,
      category: row.category,
      priceTTC: Number(row.price_ttc),
      inStock: row.in_stock,
      stockQuantity: row.stock_quantity ?? 0,
      isArchived: row.is_archived,
      imageCount: images.length,
      heroImage: images[0]?.url ?? null,
      sortOrder: row.sort_order,
    }
  })
}

export async function getProductAdminBySku(sku: string): Promise<AdminProductDetail | undefined> {
  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('products')
    .select(
      `id, sku, slug, name, category, price_ht, tva, price_ttc, short_description, description,
       features, included, source_url, in_stock, stock_quantity, is_featured, is_archived, sort_order,
       product_images ( id, url, alt, position )`,
    )
    .eq('sku', sku)
    .maybeSingle()

  if (error) {
    throw new Error(`Impossible de charger le produit ${sku} : ${error.message}`)
  }
  if (!data) return undefined

  const images = (data.product_images ?? [])
    .slice()
    .sort((a: any, b: any) => a.position - b.position)

  return {
    id: data.id,
    sku: data.sku,
    slug: data.slug,
    name: data.name,
    category: data.category,
    priceHT: Number(data.price_ht),
    tva: Number(data.tva),
    priceTTC: Number(data.price_ttc),
    shortDescription: data.short_description ?? '',
    description: data.description ?? '',
    features: data.features ?? [],
    included: data.included ?? [],
    sourceUrl: data.source_url ?? '',
    inStock: data.in_stock,
    stockQuantity: data.stock_quantity ?? 0,
    isFeatured: data.is_featured,
    isArchived: data.is_archived,
    sortOrder: data.sort_order,
    images,
  }
}

function toRow(values: ProductFormValues) {
  return {
    sku: values.sku,
    slug: values.slug,
    name: values.name,
    category: values.category,
    price_ht: values.priceHT,
    tva: values.tva,
    price_ttc: values.priceTTC,
    short_description: values.shortDescription,
    description: values.description,
    features: values.features.map((f) => f.value),
    included: values.included.map((f) => f.value),
    source_url: values.sourceUrl || null,
    // in_stock is maintained by a DB trigger from stock_quantity, so it
    // is deliberately not written here — writing both invites drift.
    stock_quantity: values.stockQuantity,
    is_featured: values.isFeatured,
    sort_order: values.sortOrder,
  }
}

export async function createProduct(values: ProductFormValues): Promise<{ id: string }> {
  const supabase = createAdminClient()

  const { data: existingSku } = await supabase
    .from('products')
    .select('sku')
    .eq('sku', values.sku)
    .maybeSingle()
  if (existingSku) {
    throw new Error(`La référence ${values.sku} existe déjà.`)
  }

  const { data: existingSlug } = await supabase
    .from('products')
    .select('slug')
    .eq('slug', values.slug)
    .maybeSingle()
  if (existingSlug) {
    throw new Error(`Le slug « ${values.slug} » existe déjà.`)
  }

  const { data, error } = await supabase.from('products').insert(toRow(values)).select('id').single()

  if (error) {
    throw new Error(`Impossible de créer le produit : ${error.message}`)
  }

  return { id: data.id }
}

export async function updateProduct(sku: string, values: ProductFormValues): Promise<void> {
  const supabase = createAdminClient()

  if (values.slug) {
    const { data: existingSlug } = await supabase
      .from('products')
      .select('sku')
      .eq('slug', values.slug)
      .neq('sku', sku)
      .maybeSingle()
    if (existingSlug) {
      throw new Error(`Le slug « ${values.slug} » est déjà utilisé par un autre produit.`)
    }
  }

  const row = toRow(values)
  const { sku: _sku, ...updatable } = row

  const { error } = await supabase.from('products').update(updatable).eq('sku', sku)

  if (error) {
    throw new Error(`Impossible de mettre à jour le produit : ${error.message}`)
  }
}

export async function setProductArchived(sku: string, archived: boolean): Promise<void> {
  const supabase = createAdminClient()
  const { error } = await supabase.from('products').update({ is_archived: archived }).eq('sku', sku)

  if (error) {
    throw new Error(`Impossible de mettre à jour le produit : ${error.message}`)
  }
}

export async function hardDeleteProduct(sku: string): Promise<void> {
  const supabase = createAdminClient()

  const { data: product, error: fetchError } = await supabase
    .from('products')
    .select('id, product_images ( url )')
    .eq('sku', sku)
    .maybeSingle()

  if (fetchError || !product) {
    throw new Error('Produit introuvable.')
  }

  const paths = (product.product_images ?? []).map((img: any) => storagePathFromPublicUrl(img.url))
  if (paths.length > 0) {
    const { error: storageError } = await supabase.storage.from(BUCKET).remove(paths)
    if (storageError) {
      throw new Error(`Impossible de supprimer les images : ${storageError.message}`)
    }
  }

  // product_images rows cascade automatically (FK on delete cascade).
  const { error: deleteError } = await supabase.from('products').delete().eq('id', product.id)
  if (deleteError) {
    throw new Error(`Impossible de supprimer le produit : ${deleteError.message}`)
  }
}

export async function addProductImage(
  productId: string,
  sku: string,
  file: File,
): Promise<AdminProductImage> {
  const supabase = createAdminClient()

  const { data: existing, error: existingError } = await supabase
    .from('product_images')
    .select('position')
    .eq('product_id', productId)
    .order('position', { ascending: false })
    .limit(1)

  if (existingError) {
    throw new Error(`Impossible de lire les images existantes : ${existingError.message}`)
  }

  const nextPosition = existing && existing.length > 0 ? existing[0].position + 1 : 0
  const safeName = file.name.replace(/[^a-zA-Z0-9.\-_]/g, '-')
  const path = `${sku}/${Date.now()}-${safeName}`

  const { error: uploadError } = await supabase.storage.from(BUCKET).upload(path, file, {
    contentType: file.type || undefined,
    upsert: false,
  })

  if (uploadError) {
    throw new Error(`Échec de l'envoi de l'image : ${uploadError.message}`)
  }

  const { data: publicUrlData } = supabase.storage.from(BUCKET).getPublicUrl(path)

  const { data: inserted, error: insertError } = await supabase
    .from('product_images')
    .insert({ product_id: productId, url: publicUrlData.publicUrl, position: nextPosition })
    .select('id, url, alt, position')
    .single()

  if (insertError) {
    throw new Error(`Impossible d'enregistrer l'image : ${insertError.message}`)
  }

  return inserted
}

/**
 * The storefront slug for a SKU, so the image actions can revalidate the
 * public product page they just changed. Returns null if the SKU is gone,
 * which callers treat as "nothing public to revalidate".
 */
export async function getProductSlugBySku(sku: string): Promise<string | null> {
  const supabase = createAdminClient()
  const { data } = await supabase.from('products').select('slug').eq('sku', sku).maybeSingle()
  return (data as { slug?: string } | null)?.slug ?? null
}

export async function deleteProductImage(imageId: string): Promise<void> {
  const supabase = createAdminClient()

  const { data: image, error: fetchError } = await supabase
    .from('product_images')
    .select('id, url, product_id')
    .eq('id', imageId)
    .maybeSingle()

  if (fetchError || !image) {
    throw new Error('Image introuvable.')
  }

  const path = storagePathFromPublicUrl(image.url)
  const { error: storageError } = await supabase.storage.from(BUCKET).remove([path])
  if (storageError) {
    throw new Error(`Impossible de supprimer le fichier : ${storageError.message}`)
  }

  const { error: deleteError } = await supabase.from('product_images').delete().eq('id', imageId)
  if (deleteError) {
    throw new Error(`Impossible de supprimer l'image : ${deleteError.message}`)
  }

  await resequenceImages(image.product_id)
}

export async function reorderProductImages(
  productId: string,
  orderedImageIds: string[],
): Promise<void> {
  const supabase = createAdminClient()

  // One UPDATE per image, but issued together rather than in sequence —
  // reordering eight images was eight serial round-trips, which is what
  // made a drag-and-drop feel like it had hung.
  //
  // Still one statement per row on purpose: each image gets a different
  // position, so this cannot collapse into a single WHERE, and an upsert
  // would need every column of the row to avoid nulling the rest. The
  // product_id filter stays on each one so a forged id cannot move an
  // image belonging to another product.
  const results = await Promise.all(
    orderedImageIds.map((imageId, position) =>
      supabase
        .from('product_images')
        .update({ position })
        .eq('id', imageId)
        .eq('product_id', productId),
    ),
  )

  const failed = results.find((result) => result.error)
  if (failed?.error) {
    throw new Error(`Impossible de réordonner les images : ${failed.error.message}`)
  }
}

async function resequenceImages(productId: string): Promise<void> {
  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('product_images')
    .select('id')
    .eq('product_id', productId)
    .order('position', { ascending: true })

  if (error || !data) return

  await reorderProductImages(
    productId,
    data.map((row) => row.id),
  )
}
