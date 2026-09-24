'use server'

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { requireAdmin } from '@/lib/admin/guard'
import { createGrade, setGradeArchived, updateGrade } from '@/lib/conseiller/grades'
import { changeAdvisorGrade } from '@/lib/conseiller/accounts'
import { todayInTunis } from '@/lib/conseiller/sales'
import { gradeSchema, newGradeSchema } from '@/lib/conseiller/format'

export type GradeActionState = { error?: string; success?: boolean }

function message(error: unknown): string {
  return error instanceof Error ? error.message : 'Une erreur est survenue.'
}

async function adminActor() {
  const admin = await requireAdmin()
  return { id: admin.id, role: 'admin' as const }
}

function readGradeForm(formData: FormData) {
  return {
    name: String(formData.get('name') ?? ''),
    rank: String(formData.get('rank') ?? ''),
    description: String(formData.get('description') ?? ''),
    minRevenue: String(formData.get('minRevenue') ?? ''),
    minSales: String(formData.get('minSales') ?? ''),
    minRecruits: String(formData.get('minRecruits') ?? ''),
    periodMonths: String(formData.get('periodMonths') ?? ''),
  }
}

function revalidateGrades() {
  revalidatePath('/admin-r/conseillers/grades')
  revalidatePath('/admin-r/conseillers/promotions')
  revalidatePath('/admin-r/remuneration')
  revalidatePath('/conseiller', 'layout')
}

/** New grade with its remuneration (F1, F2, F3). */
export async function createGradeAction(
  _prevState: GradeActionState,
  formData: FormData,
): Promise<GradeActionState> {
  const parsed = newGradeSchema.safeParse({
    ...readGradeForm(formData),
    robotSaleBonus: String(formData.get('robotSaleBonus') ?? ''),
    recruitmentBonus: String(formData.get('recruitmentBonus') ?? ''),
  })
  if (!parsed.success) return { error: parsed.error.issues[0]?.message }

  try {
    await createGrade(parsed.data, await adminActor(), todayInTunis())
  } catch (error) {
    return { error: message(error) }
  }
  revalidateGrades()
  return { success: true }
}

export async function updateGradeAction(
  gradeId: string,
  _prevState: GradeActionState,
  formData: FormData,
): Promise<GradeActionState> {
  const parsed = gradeSchema.safeParse(readGradeForm(formData))
  if (!parsed.success) return { error: parsed.error.issues[0]?.message }

  try {
    await updateGrade(gradeId, parsed.data, await adminActor())
  } catch (error) {
    return { error: message(error) }
  }
  revalidateGrades()
  return { success: true }
}

export async function setGradeArchivedAction(
  gradeId: string,
  archived: boolean,
): Promise<GradeActionState> {
  try {
    await setGradeArchived(gradeId, archived, await adminActor())
  } catch (error) {
    return { error: message(error) }
  }
  revalidateGrades()
  return { success: true }
}

/**
 * Validates a proposed promotion (F5 → F6). Goes through the same path as
 * a manual grade change, so the history keeps it with its reason.
 */
export async function promoteAction(
  advisorId: string,
  gradeId: string,
  reason: string,
): Promise<GradeActionState> {
  if (!z.uuid().safeParse(advisorId).success || !z.uuid().safeParse(gradeId).success) {
    return { error: 'Requête invalide.' }
  }

  try {
    await changeAdvisorGrade(advisorId, gradeId, reason.slice(0, 500), await adminActor())
  } catch (error) {
    return { error: message(error) }
  }
  revalidateGrades()
  revalidatePath(`/admin-r/conseillers/${advisorId}`)
  redirect('/admin-r/conseillers/promotions')
}
