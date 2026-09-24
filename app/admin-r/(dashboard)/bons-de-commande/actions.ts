'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { requireAdmin } from '@/lib/admin/guard'
import {
  cancelSale,
  invoiceSale,
  recordInstallmentPayment,
  refuseSale,
  reviseSchedule,
  undoInstallmentPayment,
} from '@/lib/conseiller/sales'
import { INSTALLMENT_PAYMENT_METHODS } from '@/lib/conseiller/format'
import { recalculateSaleCommission } from '@/lib/conseiller/remuneration'

export type SaleActionState = { error?: string; success?: boolean }

const reasonSchema = z.string().trim().min(3, 'Indiquez un motif (3 caractères minimum).').max(500)
const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date invalide.')

function message(error: unknown): string {
  return error instanceof Error ? error.message : 'Une erreur est survenue.'
}

async function adminActor() {
  const admin = await requireAdmin()
  return { id: admin.id, role: 'admin' as const }
}

/** Every page that shows this sale, on both sides. */
function revalidateSale(reference: string) {
  revalidatePath('/admin-r/bons-de-commande')
  revalidatePath(`/admin-r/bons-de-commande/${reference}`)
  revalidatePath('/admin-r')
  revalidatePath(`/admin-r/livraisons/${reference}`)
  revalidatePath('/conseiller/ventes')
  revalidatePath(`/conseiller/ventes/${reference}`)
  revalidatePath('/conseiller/remuneration')
  revalidatePath('/admin-r/remuneration')
}

export async function invoiceSaleAction(
  reference: string,
  _prevState: SaleActionState,
  formData: FormData,
): Promise<SaleActionState> {
  try {
    await invoiceSale(
      reference,
      {
        applyDeliveryFee: formData.get('applyDeliveryFee') === 'on',
        applyTimbre: formData.get('applyTimbre') === 'on',
      },
      await adminActor(),
    )
  } catch (error) {
    return { error: message(error) }
  }
  revalidateSale(reference)
  return { success: true }
}

export async function refuseSaleAction(
  reference: string,
  _prevState: SaleActionState,
  formData: FormData,
): Promise<SaleActionState> {
  const reason = reasonSchema.safeParse(formData.get('reason'))
  if (!reason.success) return { error: reason.error.issues[0]?.message }

  try {
    await refuseSale(reference, reason.data, await adminActor())
  } catch (error) {
    return { error: message(error) }
  }
  revalidateSale(reference)
  return { success: true }
}

export async function cancelSaleAction(
  reference: string,
  _prevState: SaleActionState,
  formData: FormData,
): Promise<SaleActionState> {
  const reason = reasonSchema.safeParse(formData.get('reason'))
  if (!reason.success) return { error: reason.error.issues[0]?.message }

  try {
    await cancelSale(reference, reason.data, await adminActor())
  } catch (error) {
    return { error: message(error) }
  }
  revalidateSale(reference)
  return { success: true }
}

export async function recordPaymentAction(
  reference: string,
  installmentId: string,
  _prevState: SaleActionState,
  formData: FormData,
): Promise<SaleActionState> {
  const parsed = z
    .object({
      paidAt: isoDate,
      method: z.enum(INSTALLMENT_PAYMENT_METHODS, { message: 'Choisissez un mode de paiement.' }),
      note: z.string().trim().max(200, 'Note trop longue.'),
    })
    .safeParse({
      paidAt: formData.get('paidAt'),
      method: formData.get('method'),
      note: formData.get('note') ?? '',
    })
  if (!parsed.success) return { error: parsed.error.issues[0]?.message }

  try {
    await recordInstallmentPayment(installmentId, parsed.data, await adminActor())
  } catch (error) {
    return { error: message(error) }
  }
  revalidateSale(reference)
  return { success: true }
}

export async function undoPaymentAction(
  reference: string,
  installmentId: string,
): Promise<SaleActionState> {
  try {
    await undoInstallmentPayment(installmentId, await adminActor())
  } catch (error) {
    return { error: message(error) }
  }
  revalidateSale(reference)
  return { success: true }
}

export async function reviseScheduleAction(
  reference: string,
  rows: { id: string; dueDate: string; amount: number }[],
): Promise<SaleActionState> {
  const parsed = z
    .array(z.object({ id: z.uuid(), dueDate: isoDate, amount: z.number().positive() }))
    .min(1)
    .safeParse(rows)
  if (!parsed.success) return { error: 'Échéancier invalide.' }

  try {
    await reviseSchedule(reference, parsed.data, await adminActor())
  } catch (error) {
    return { error: message(error) }
  }
  revalidateSale(reference)
  return { success: true }
}

/**
 * Re-runs the commission engine for one sale. Normally automatic; this
 * is the manual retry if it ever failed after a payment or cancellation.
 */
export async function recalculateCommissionAction(
  reference: string,
  orderId: string,
): Promise<SaleActionState> {
  if (!z.uuid().safeParse(orderId).success) return { error: 'Requête invalide.' }
  try {
    const actor = await adminActor()
    await recalculateSaleCommission(orderId, actor.id)
  } catch (error) {
    return { error: message(error) }
  }
  revalidateSale(reference)
  revalidatePath('/admin-r/remuneration')
  return { success: true }
}
