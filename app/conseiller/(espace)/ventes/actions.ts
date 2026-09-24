'use server'

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { requireAdvisor } from '@/lib/conseiller/guard'
import { deleteDraft, saveDraft } from '@/lib/conseiller/sales'
import { orderFormSchema, type OrderFormValues } from '@/lib/conseiller/format'

export type OrderFormState = { error?: string }

/**
 * Saves a draft, or saves and submits it. Called with plain values from
 * the order-form editor rather than FormData, because the lines are a list.
 *
 * `reference` is null for a new form. Ownership of an existing one is
 * checked in saveDraft() against the advisor from the guard.
 */
export async function saveOrderFormAction(
  reference: string | null,
  values: OrderFormValues,
  submit: boolean,
): Promise<OrderFormState> {
  const parsed = orderFormSchema.safeParse(values)
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Le bon de commande contient des erreurs.' }
  }

  let saved: string
  try {
    const advisor = await requireAdvisor()
    saved = await saveDraft(advisor.id, reference, parsed.data, submit)
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'Une erreur est survenue.' }
  }

  revalidatePath('/conseiller/ventes')
  revalidatePath(`/conseiller/ventes/${saved}`)
  if (submit) revalidatePath('/admin-r/bons-de-commande')
  redirect(`/conseiller/ventes/${saved}`)
}

export async function deleteDraftAction(reference: string): Promise<OrderFormState> {
  try {
    const advisor = await requireAdvisor()
    await deleteDraft(advisor.id, reference)
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'Une erreur est survenue.' }
  }

  revalidatePath('/conseiller/ventes')
  redirect('/conseiller/ventes')
}
