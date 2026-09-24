'use server'

import { getCustomer } from '@/lib/compte/guard'
import { checkAdvisorCode } from '@/lib/conseiller/affiliation'

export type AdvisorCodeCheck = { name?: string; error?: string }

/**
 * Live check of an advisor code typed at checkout, so the customer sees
 * "Conseiller : Karim B." before ordering. Display only: nothing is
 * recorded here. The order route checks the code again and applies it.
 */
export async function checkAdvisorCodeAction(code: string): Promise<AdvisorCodeCheck> {
  const customer = await getCustomer()
  if (!customer) return { error: 'Connectez-vous pour utiliser un code conseiller.' }

  const trimmed = code.trim()
  if (!trimmed) return {}

  const result = await checkAdvisorCode(trimmed, customer.id)
  return 'error' in result ? { error: result.error } : { name: result.name }
}
