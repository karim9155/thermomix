'use server'

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { requireAdvisor } from '@/lib/conseiller/guard'
import {
  cancelWorkshop,
  createWorkshop,
  saveWorkshopReport,
  updateWorkshop,
} from '@/lib/conseiller/workshops'
import { workshopReportSchema, workshopSchema } from '@/lib/conseiller/format'

export type WorkshopActionState = { error?: string; success?: boolean }

function message(error: unknown): string {
  return error instanceof Error ? error.message : 'Une erreur est survenue.'
}

function readForm(formData: FormData) {
  return workshopSchema.safeParse({
    hostClientId: String(formData.get('hostClientId') ?? ''),
    scheduledAt: String(formData.get('scheduledAt') ?? ''),
    location: String(formData.get('location') ?? ''),
    gouvernorat: formData.get('gouvernorat'),
    invitedCount: String(formData.get('invitedCount') ?? ''),
    notes: String(formData.get('notes') ?? ''),
  })
}

function revalidateWorkshops(id?: string) {
  revalidatePath('/conseiller/ateliers')
  if (id) revalidatePath(`/conseiller/ateliers/${id}`)
  revalidatePath('/admin-r/ateliers')
  if (id) revalidatePath(`/admin-r/ateliers/${id}`)
}

/** Plan a workshop (E1). The advisor is the signed-in one — never a form field. */
export async function createWorkshopAction(
  _prevState: WorkshopActionState,
  formData: FormData,
): Promise<WorkshopActionState> {
  const parsed = readForm(formData)
  if (!parsed.success) return { error: parsed.error.issues[0]?.message }

  let id: string
  try {
    const advisor = await requireAdvisor()
    id = await createWorkshop(advisor.id, parsed.data)
  } catch (error) {
    return { error: message(error) }
  }
  revalidateWorkshops(id)
  redirect(`/conseiller/ateliers/${id}`)
}

/** Reschedule or edit a planned workshop (E2). */
export async function updateWorkshopAction(
  id: string,
  _prevState: WorkshopActionState,
  formData: FormData,
): Promise<WorkshopActionState> {
  const parsed = readForm(formData)
  if (!parsed.success) return { error: parsed.error.issues[0]?.message }

  try {
    const advisor = await requireAdvisor()
    await updateWorkshop(advisor.id, id, parsed.data)
  } catch (error) {
    return { error: message(error) }
  }
  revalidateWorkshops(id)
  return { success: true }
}

export async function cancelWorkshopAction(id: string, reason: string): Promise<WorkshopActionState> {
  const parsed = z.string().trim().min(3, 'Indiquez un motif (3 caractères minimum).').max(500).safeParse(reason)
  if (!parsed.success) return { error: parsed.error.issues[0]?.message }

  try {
    const advisor = await requireAdvisor()
    await cancelWorkshop(advisor.id, id, parsed.data)
  } catch (error) {
    return { error: message(error) }
  }
  revalidateWorkshops(id)
  return { success: true }
}

/** Mark done with the report, or update the report (E3, E4). */
export async function saveReportAction(
  id: string,
  _prevState: WorkshopActionState,
  formData: FormData,
): Promise<WorkshopActionState> {
  const parsed = workshopReportSchema.safeParse({
    attendeesCount: String(formData.get('attendeesCount') ?? ''),
    contactsCount: String(formData.get('contactsCount') ?? ''),
    feedback: String(formData.get('feedback') ?? ''),
    observations: String(formData.get('observations') ?? ''),
  })
  if (!parsed.success) return { error: parsed.error.issues[0]?.message }

  try {
    const advisor = await requireAdvisor()
    await saveWorkshopReport(advisor.id, id, parsed.data)
  } catch (error) {
    return { error: message(error) }
  }
  revalidateWorkshops(id)
  return { success: true }
}
