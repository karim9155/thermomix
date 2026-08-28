'use server'

import { revalidatePath } from 'next/cache'
import { requireAdmin } from '@/lib/admin/guard'
import { productFormSchema, type ProductFormValues } from '@/lib/admin/product-schema'
import {
  createProduct,
  updateProduct,
  setProductArchived,
  hardDeleteProduct,
  addProductImage,
  deleteProductImage,
  reorderProductImages,
  getProductSlugBySku,
} from '@/lib/admin/products'

export type ActionState = { error?: string; success?: boolean }

function revalidateStorefront(slugs: string[]) {
  revalidatePath('/')
  revalidatePath('/boutique')
  for (const slug of slugs) {
    if (slug) revalidatePath(`/boutique/${slug}`)
  }
}

/**
 * Everything an image change affects.
 *
 * The image actions used to revalidate only '/admin-r/produits' — the LIST
 * page — while the image manager itself lives on the DETAIL page, so the
 * page the admin was looking at was never invalidated and only the
 * component's router.refresh() made the change appear. They also never
 * touched the storefront, so a customer kept seeing the old photo until
 * the 5-minute ISR window lapsed. Both are fixed here.
 */
async function revalidateProductImagePaths(sku: string) {
  revalidatePath('/admin-r/produits')
  revalidatePath(`/admin-r/produits/${sku}`)

  const slug = await getProductSlugBySku(sku)
  revalidateStorefront(slug ? [slug] : [])
}

export async function createProductAction(values: ProductFormValues): Promise<ActionState> {
  try {
    await requireAdmin()
    const parsed = productFormSchema.safeParse(values)
    if (!parsed.success) {
      return { error: 'Le formulaire contient des erreurs.' }
    }
    await createProduct(parsed.data)
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'Une erreur est survenue.' }
  }

  revalidatePath('/admin-r/produits')
  revalidateStorefront([values.slug])
  return { success: true }
}

export async function updateProductAction(
  sku: string,
  previousSlug: string,
  values: ProductFormValues,
): Promise<ActionState> {
  try {
    await requireAdmin()
    const parsed = productFormSchema.safeParse(values)
    if (!parsed.success) {
      return { error: 'Le formulaire contient des erreurs.' }
    }
    await updateProduct(sku, parsed.data)
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'Une erreur est survenue.' }
  }

  revalidatePath('/admin-r/produits')
  revalidatePath(`/admin-r/produits/${sku}`)
  revalidateStorefront([previousSlug, values.slug])
  return { success: true }
}

/**
 * No longer wired to a button — the Archiver action was removed from the
 * products table. Kept because is_archived still hides a product from the
 * storefront (lib/products.ts filters on it), so this is what a future
 * control would call, and deleting it would leave a product archived by
 * hand with no way back other than SQL.
 */
export async function setArchivedAction(
  sku: string,
  slug: string,
  archived: boolean,
): Promise<ActionState> {
  try {
    await requireAdmin()
    await setProductArchived(sku, archived)
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'Une erreur est survenue.' }
  }

  revalidatePath('/admin-r/produits')
  revalidateStorefront([slug])
  return { success: true }
}

export async function hardDeleteProductAction(sku: string, slug: string): Promise<ActionState> {
  try {
    await requireAdmin()
    await hardDeleteProduct(sku)
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'Une erreur est survenue.' }
  }

  revalidatePath('/admin-r/produits')
  revalidateStorefront([slug])
  return { success: true }
}

export type UploadImageState = { error?: string; success?: boolean }

export async function uploadProductImageAction(formData: FormData): Promise<UploadImageState> {
  try {
    await requireAdmin()
    const productId = String(formData.get('productId') ?? '')
    const sku = String(formData.get('sku') ?? '')
    const file = formData.get('file')

    if (!productId || !sku || !(file instanceof File) || file.size === 0) {
      return { error: 'Fichier manquant.' }
    }

    await addProductImage(productId, sku, file)
    await revalidateProductImagePaths(sku)
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Échec de l'envoi." }
  }

  return { success: true }
}

export async function deleteProductImageAction(
  imageId: string,
  sku: string,
): Promise<ActionState> {
  try {
    await requireAdmin()
    await deleteProductImage(imageId)
    await revalidateProductImagePaths(sku)
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'Une erreur est survenue.' }
  }

  return { success: true }
}

export async function reorderProductImagesAction(
  productId: string,
  orderedImageIds: string[],
  sku: string,
): Promise<ActionState> {
  try {
    await requireAdmin()
    await reorderProductImages(productId, orderedImageIds)
    await revalidateProductImagePaths(sku)
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'Une erreur est survenue.' }
  }

  return { success: true }
}
