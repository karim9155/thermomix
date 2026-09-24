'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { requireAdvisor } from '@/lib/conseiller/guard'
import { saveDailyComment } from '@/lib/conseiller/journal'
import { todayInTunis } from '@/lib/conseiller/sales'

export type CommentState = { error?: string; success?: boolean }

/** The advisor's own comment on one day of their report (J2). */
export async function saveCommentAction(
  day: string,
  _prevState: CommentState,
  formData: FormData,
): Promise<CommentState> {
  const parsed = z
    .object({
      day: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
      comment: z.string().max(2000, 'Commentaire trop long (2000 caractères maximum).'),
    })
    .safeParse({ day, comment: String(formData.get('comment') ?? '') })
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'Données invalides.' }

  try {
    // Always the signed-in advisor's own report.
    const advisor = await requireAdvisor()
    await saveDailyComment(advisor.id, parsed.data.day, parsed.data.comment, todayInTunis())
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'Une erreur est survenue.' }
  }

  revalidatePath('/conseiller/journal')
  return { success: true }
}
