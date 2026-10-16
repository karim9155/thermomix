'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { requireAdmin } from '@/lib/admin/guard'
import { reassignClient } from '@/lib/conseiller/clients'
import { reassignCustomerAttribution } from '@/lib/conseiller/affiliation'

export type ReassignState = { error?: string; success?: boolean }

/** Moves a client to another advisor (C7). */
export async function reassignClientAction(
  clientId: string,
  advisorId: string,
): Promise<ReassignState> {
  if (!z.uuid().safeParse(advisorId).success) return { error: 'Conseiller invalide.' }

  try {
    const admin = await requireAdmin()
    await reassignClient(clientId, advisorId, { id: admin.id, role: 'admin' })
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'Une erreur est survenue.' }
  }

  revalidatePath('/admin-r/clients')
  revalidatePath('/conseiller/clients')
  return { success: true }
}

/**
 * Moves an affiliated web customer to another advisor. Only their future
 * orders follow: past ones are reattributed from the order itself.
 */
export async function reassignAffiliatedCustomerAction(
  userId: string,
  advisorId: string,
): Promise<ReassignState> {
  if (!z.uuid().safeParse(userId).success) return { error: 'Client invalide.' }
  if (!z.uuid().safeParse(advisorId).success) return { error: 'Conseiller invalide.' }

  try {
    const admin = await requireAdmin()
    await reassignCustomerAttribution(userId, advisorId, { id: admin.id, role: 'admin' })
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'Une erreur est survenue.' }
  }

  revalidatePath('/admin-r/clients')
  // The advisor's own affiliate page counts attributed customers.
  revalidatePath('/conseiller/parrainage')
  return { success: true }
}
