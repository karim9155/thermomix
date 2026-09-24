'use server'

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { requireAdmin } from '@/lib/admin/guard'
import {
  closeChallenge,
  createChallenge,
  deleteChallenge,
  setChallengeImage,
  setChallengePublished,
  updateChallenge,
} from '@/lib/conseiller/challenges'
import { todayInTunis } from '@/lib/conseiller/sales'
import { challengeSchema } from '@/lib/conseiller/format'

export type ChallengeActionState = { error?: string; success?: boolean }

// The browser shrinks pictures before sending (components/admin/
// challenge-form.tsx), so anything bigger than this wasn't resized and
// would hit the Server Action body limit anyway.
const MAX_IMAGE_BYTES = 950 * 1024

function message(error: unknown): string {
  return error instanceof Error ? error.message : 'Une erreur est survenue.'
}

async function adminActor() {
  const admin = await requireAdmin()
  return { id: admin.id, role: 'admin' as const }
}

function readForm(formData: FormData) {
  return challengeSchema.safeParse({
    title: String(formData.get('title') ?? ''),
    description: String(formData.get('description') ?? ''),
    metric: formData.get('metric'),
    target: String(formData.get('target') ?? ''),
    winnersCount: String(formData.get('winnersCount') ?? ''),
    rewardLabel: String(formData.get('rewardLabel') ?? ''),
    prizeAmount: String(formData.get('prizeAmount') ?? ''),
    startsOn: formData.get('startsOn'),
    endsOn: formData.get('endsOn'),
  })
}

function readImage(formData: FormData): File | null | string {
  const file = formData.get('image')
  if (!(file instanceof File) || file.size === 0) return null
  if (!file.type.startsWith('image/')) return 'Le visuel doit être une image.'
  if (file.size > MAX_IMAGE_BYTES) return 'Image trop lourde (1 Mo maximum).'
  return file
}

function revalidateChallenges(id?: string) {
  revalidatePath('/admin-r/challenges')
  if (id) revalidatePath(`/admin-r/challenges/${id}`)
  revalidatePath('/conseiller/challenges')
  if (id) revalidatePath(`/conseiller/challenges/${id}`)
}

export async function createChallengeAction(
  _prevState: ChallengeActionState,
  formData: FormData,
): Promise<ChallengeActionState> {
  const parsed = readForm(formData)
  if (!parsed.success) return { error: parsed.error.issues[0]?.message }
  const image = readImage(formData)
  if (typeof image === 'string') return { error: image }

  let id: string
  try {
    id = await createChallenge(parsed.data, await adminActor())
    if (image) await setChallengeImage(id, image)
  } catch (error) {
    return { error: message(error) }
  }
  revalidateChallenges(id)
  redirect(`/admin-r/challenges/${id}`)
}

export async function updateChallengeAction(
  id: string,
  _prevState: ChallengeActionState,
  formData: FormData,
): Promise<ChallengeActionState> {
  const parsed = readForm(formData)
  if (!parsed.success) return { error: parsed.error.issues[0]?.message }
  const image = readImage(formData)
  if (typeof image === 'string') return { error: image }

  try {
    await updateChallenge(id, parsed.data, await adminActor())
    if (image) await setChallengeImage(id, image)
  } catch (error) {
    return { error: message(error) }
  }
  revalidateChallenges(id)
  return { success: true }
}

export async function setChallengePublishedAction(
  id: string,
  published: boolean,
): Promise<ChallengeActionState> {
  try {
    await setChallengePublished(id, published, await adminActor())
  } catch (error) {
    return { error: message(error) }
  }
  revalidateChallenges(id)
  return { success: true }
}

export async function deleteChallengeAction(id: string): Promise<ChallengeActionState> {
  try {
    await deleteChallenge(id, await adminActor())
  } catch (error) {
    return { error: message(error) }
  }
  revalidateChallenges()
  redirect('/admin-r/challenges')
}

/** Final winners and prizes (H6, H7). */
export async function closeChallengeAction(
  id: string,
  winnerIds: string[],
): Promise<ChallengeActionState> {
  const parsed = z.array(z.uuid()).max(500).safeParse(winnerIds)
  if (!parsed.success) return { error: 'Sélection invalide.' }

  try {
    await closeChallenge(id, parsed.data, await adminActor(), todayInTunis())
  } catch (error) {
    return { error: message(error) }
  }
  revalidateChallenges(id)
  revalidatePath('/admin-r/remuneration')
  revalidatePath('/conseiller/remuneration')
  return { success: true }
}
