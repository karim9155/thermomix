'use server'

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { requireAdvisor } from '@/lib/conseiller/guard'
import { createClientRecord, updateClientRecord } from '@/lib/conseiller/clients'
import { clientSchema } from '@/lib/conseiller/format'

export type ClientFormState = { error?: string; success?: boolean }

function readClientForm(formData: FormData) {
  return clientSchema.safeParse({
    prenom: formData.get('prenom'),
    nom: formData.get('nom'),
    telephone: formData.get('telephone'),
    email: formData.get('email') ?? '',
    adresse: formData.get('adresse') ?? '',
    ville: formData.get('ville') ?? '',
    gouvernorat: formData.get('gouvernorat'),
    age: formData.get('age') ?? '',
    sexe: formData.get('sexe') ?? '',
    notes: formData.get('notes') ?? '',
  })
}

export async function createClientAction(
  _prevState: ClientFormState,
  formData: FormData,
): Promise<ClientFormState> {
  const parsed = readClientForm(formData)
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Le formulaire contient des erreurs.' }
  }

  let clientId: string
  try {
    // The owner is the signed-in advisor — never a form field.
    const advisor = await requireAdvisor()
    clientId = await createClientRecord(advisor.id, parsed.data, {
      id: advisor.id,
      role: 'conseiller',
    })
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'Une erreur est survenue.' }
  }

  revalidatePath('/conseiller/clients')

  // Straight on to the order form when the client was created from there.
  redirect(
    formData.get('next') === 'vente'
      ? `/conseiller/ventes/nouveau?client=${clientId}`
      : `/conseiller/clients/${clientId}`,
  )
}

export async function updateClientAction(
  clientId: string,
  _prevState: ClientFormState,
  formData: FormData,
): Promise<ClientFormState> {
  const parsed = readClientForm(formData)
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Le formulaire contient des erreurs.' }
  }

  try {
    const advisor = await requireAdvisor()
    // advisorId scopes the update: another advisor's client reads as missing.
    await updateClientRecord(
      clientId,
      parsed.data,
      { id: advisor.id, role: 'conseiller' },
      { advisorId: advisor.id },
    )
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'Une erreur est survenue.' }
  }

  revalidatePath('/conseiller/clients')
  revalidatePath(`/conseiller/clients/${clientId}`)
  return { success: true }
}
