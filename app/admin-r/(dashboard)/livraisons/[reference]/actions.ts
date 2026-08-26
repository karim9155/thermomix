'use server'

import { revalidatePath } from 'next/cache'
import { requireAdmin } from '@/lib/admin/guard'
import {
  updateDeliveryStatus,
  updateEstimatedDelivery,
  uploadOrderInvoice,
  type DeliveryStatus,
} from '@/lib/admin/orders'

const MAX_INVOICE_SIZE_BYTES = 10 * 1024 * 1024

export type UpdateDeliveryStatusState = { error?: string; success?: boolean }

export async function updateDeliveryStatusAction(
  reference: string,
  newStatus: DeliveryStatus,
): Promise<UpdateDeliveryStatusState> {
  try {
    const admin = await requireAdmin()
    await updateDeliveryStatus(reference, newStatus, admin.id)
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'Une erreur est survenue.' }
  }

  revalidatePath(`/admin-r/livraisons/${reference}`)
  revalidatePath('/admin-r')

  return { success: true }
}

export type UploadOrderInvoiceState = { error?: string; success?: boolean }

export async function uploadOrderInvoiceAction(
  reference: string,
  formData: FormData,
): Promise<UploadOrderInvoiceState> {
  try {
    await requireAdmin()

    const file = formData.get('file')
    if (!(file instanceof File) || file.size === 0) {
      return { error: 'Fichier manquant.' }
    }
    if (file.type !== 'application/pdf') {
      return { error: 'La facture doit être un fichier PDF.' }
    }
    if (file.size > MAX_INVOICE_SIZE_BYTES) {
      return { error: 'Le fichier dépasse la taille maximale de 10 Mo.' }
    }

    await uploadOrderInvoice(reference, file)
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Échec de l'envoi." }
  }

  revalidatePath(`/admin-r/livraisons/${reference}`)
  return { success: true }
}

export type UpdateEstimatedDeliveryState = { error?: string; success?: boolean }

export async function updateEstimatedDeliveryAction(
  reference: string,
  estimatedDelivery: string,
): Promise<UpdateEstimatedDeliveryState> {
  try {
    const admin = await requireAdmin()
    await updateEstimatedDelivery(reference, estimatedDelivery, admin.id)
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'Une erreur est survenue.' }
  }

  revalidatePath(`/admin-r/livraisons/${reference}`)
  revalidatePath('/admin-r')

  return { success: true }
}
