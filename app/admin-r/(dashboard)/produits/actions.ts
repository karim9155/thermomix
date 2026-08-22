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
} from '@/lib/admin/products'

export type ActionState = { error?: string; success?: boolean }

function revalidateStorefront(slugs: string[]) {
  revalidatePath('/')
  revalidatePath('/boutique')
  for (const slug of slugs) {
    if (slug) revalidatePath(`/boutique/${slug}`)
  }
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
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Échec de l'envoi." }
  }

  revalidatePath('/admin-r/produits')
  return { success: true }
}

export async function deleteProductImageAction(imageId: string): Promise<ActionState> {
  try {
    await requireAdmin()
    await deleteProductImage(imageId)
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'Une erreur est survenue.' }
  }

  revalidatePath('/admin-r/produits')
  return { success: true }
}

export async function reorderProductImagesAction(
  productId: string,
  orderedImageIds: string[],
): Promise<ActionState> {
  try {
    await requireAdmin()
    await reorderProductImages(productId, orderedImageIds)
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'Une erreur est survenue.' }
  }

  revalidatePath('/admin-r/produits')
  return { success: true }
}
