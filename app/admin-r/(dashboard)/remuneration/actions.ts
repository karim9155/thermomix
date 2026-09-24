'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { requireAdmin } from '@/lib/admin/guard'
import {
  addAdjustment,
  cancelPayout,
  closePeriod,
  monthParam,
  recordPayout,
  setRule,
} from '@/lib/conseiller/remuneration'
import { todayInTunis } from '@/lib/conseiller/sales'
import { PAYOUT_METHODS } from '@/lib/conseiller/format'

export type RemunerationActionState = { error?: string; success?: boolean }

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date invalide.')
const monthSchema = z.string().regex(/^\d{4}-\d{2}-01$/)

/** "450", "450,5" or "450.5" → 450.5; anything else → NaN. */
function parseAmount(value: FormDataEntryValue | null): number {
  const text = String(value ?? '').trim().replace(/\s/g, '').replace(',', '.')
  return /^-?\d+(\.\d{1,3})?$/.test(text) ? Number(text) : Number.NaN
}

function message(error: unknown): string {
  return error instanceof Error ? error.message : 'Une erreur est survenue.'
}

async function adminActor() {
  const admin = await requireAdmin()
  return { id: admin.id, role: 'admin' as const }
}

function revalidateRemuneration(month?: string) {
  revalidatePath('/admin-r/remuneration')
  if (month) revalidatePath(`/admin-r/remuneration/${monthParam(month)}`)
  revalidatePath('/conseiller/remuneration')
}

/** New amounts for a grade, from a date (G8, F3). */
export async function setRuleAction(
  _prevState: RemunerationActionState,
  formData: FormData,
): Promise<RemunerationActionState> {
  const robot = parseAmount(formData.get('robotSaleBonus'))
  const recruitment = parseAmount(formData.get('recruitmentBonus'))
  const parsed = z
    .object({
      gradeId: z.uuid('Grade invalide.'),
      robotSaleBonus: z.number({ message: 'Montant invalide.' }).min(0, 'Montant invalide.'),
      recruitmentBonus: z.number({ message: 'Montant invalide.' }).min(0, 'Montant invalide.'),
      effectiveFrom: isoDate,
    })
    .safeParse({
      gradeId: formData.get('gradeId'),
      robotSaleBonus: Number.isNaN(robot) ? undefined : robot,
      recruitmentBonus: Number.isNaN(recruitment) ? undefined : recruitment,
      effectiveFrom: formData.get('effectiveFrom'),
    })
  if (!parsed.success) return { error: parsed.error.issues[0]?.message }

  try {
    await setRule(parsed.data, await adminActor(), todayInTunis())
  } catch (error) {
    return { error: message(error) }
  }
  revalidateRemuneration()
  return { success: true }
}

/** Manual bonus or deduction (G9). */
export async function addAdjustmentAction(
  _prevState: RemunerationActionState,
  formData: FormData,
): Promise<RemunerationActionState> {
  const amount = parseAmount(formData.get('amount'))
  const parsed = z
    .object({
      advisorId: z.uuid('Choisissez un conseiller.'),
      amount: z
        .number({ message: 'Montant invalide.' })
        .refine((value) => value !== 0, 'Le montant ne peut pas être nul.'),
      label: z.string().trim().min(3, 'Indiquez un motif (3 caractères minimum).').max(200),
    })
    .safeParse({
      advisorId: formData.get('advisorId'),
      amount: Number.isNaN(amount) ? undefined : amount,
      label: formData.get('label'),
    })
  if (!parsed.success) return { error: parsed.error.issues[0]?.message }

  try {
    await addAdjustment(parsed.data, await adminActor(), todayInTunis())
  } catch (error) {
    return { error: message(error) }
  }
  revalidateRemuneration()
  return { success: true }
}

/** Closes a past month by hand, ahead of the cron (G10). */
export async function closePeriodAction(month: string): Promise<RemunerationActionState> {
  if (!monthSchema.safeParse(month).success) return { error: 'Mois invalide.' }
  try {
    await closePeriod(month, await adminActor())
  } catch (error) {
    return { error: message(error) }
  }
  revalidateRemuneration(month)
  return { success: true }
}

export async function recordPayoutAction(
  month: string,
  advisorId: string,
  _prevState: RemunerationActionState,
  formData: FormData,
): Promise<RemunerationActionState> {
  const parsed = z
    .object({
      month: monthSchema,
      advisorId: z.uuid(),
      paidAt: isoDate,
      method: z.enum(PAYOUT_METHODS, { message: 'Choisissez un mode de versement.' }),
      reference: z.string().trim().max(100),
    })
    .safeParse({
      month,
      advisorId,
      paidAt: formData.get('paidAt'),
      method: formData.get('method'),
      reference: formData.get('reference') ?? '',
    })
  if (!parsed.success) return { error: parsed.error.issues[0]?.message }

  try {
    await recordPayout(parsed.data, await adminActor())
  } catch (error) {
    return { error: message(error) }
  }
  revalidateRemuneration(month)
  return { success: true }
}

export async function cancelPayoutAction(
  month: string,
  advisorId: string,
): Promise<RemunerationActionState> {
  if (!monthSchema.safeParse(month).success || !z.uuid().safeParse(advisorId).success) {
    return { error: 'Requête invalide.' }
  }
  try {
    await cancelPayout(month, advisorId, await adminActor())
  } catch (error) {
    return { error: message(error) }
  }
  revalidateRemuneration(month)
  return { success: true }
}
