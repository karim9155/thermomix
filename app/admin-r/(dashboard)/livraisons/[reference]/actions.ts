'use server'

import { revalidatePath } from 'next/cache'
import { requireAdmin } from '@/lib/admin/guard'
import {
  updateDeliveryStatus,
  updateEstimatedDelivery,
  type DeliveryStatus,
} from '@/lib/admin/orders'

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
