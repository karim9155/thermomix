// Client-safe: types, labels and schemas shared by the admin pages, the
// advisor area and their client components. Nothing here touches
// Supabase, so it can be imported from 'use client' files.

import { z } from 'zod'
import { phoneRegex } from '@/lib/checkout-schema'
import { governorates } from '@/lib/product-format'

export const ADVISOR_STATUSES = ['invite', 'actif', 'suspendu'] as const
export type AdvisorStatus = (typeof ADVISOR_STATUSES)[number]

export const ADVISOR_STATUS_LABELS: Record<AdvisorStatus, string> = {
  invite: 'Invitation envoyée',
  actif: 'Actif',
  suspendu: 'Suspendu',
}

export const ADVISOR_STATUS_CLASS: Record<AdvisorStatus, string> = {
  invite: 'badge-amber',
  actif: 'badge-green',
  suspendu: 'badge-red',
}

export const APPLICATION_STATUSES = ['en_attente', 'acceptee', 'refusee'] as const
export type ApplicationStatus = (typeof APPLICATION_STATUSES)[number]

export const APPLICATION_STATUS_LABELS: Record<ApplicationStatus, string> = {
  en_attente: 'En attente',
  acceptee: 'Acceptée',
  refusee: 'Refusée',
}

export const APPLICATION_STATUS_CLASS: Record<ApplicationStatus, string> = {
  en_attente: 'badge-amber',
  acceptee: 'badge-green',
  refusee: 'badge-red',
}

/** Regions are the 24 governorates, the same list checkout uses. */
export const REGIONS = governorates

export type Grade = {
  id: string
  name: string
  rank: number
}

// ---------- ACTIVITY LOG ----------
// Action keys are stored as-is in activity_log.action. Add new ones here
// as later phases log new kinds of action; an unknown key still renders,
// just as its raw name.

export const ACTIVITY_LABELS: Record<string, string> = {
  'conseiller.cree': 'Compte conseiller créé',
  'conseiller.invitation_envoyee': 'Invitation envoyée',
  'conseiller.active': 'Compte activé',
  'conseiller.connexion': 'Connexion',
  'conseiller.deconnexion': 'Déconnexion',
  'conseiller.mot_de_passe_defini': 'Mot de passe défini',
  'conseiller.reinitialisation_envoyee': 'Lien de réinitialisation envoyé',
  'conseiller.profil_modifie': 'Profil modifié',
  'conseiller.suspendu': 'Compte suspendu',
  'conseiller.reactive': 'Compte réactivé',
  'conseiller.grade_modifie': 'Grade modifié',
  'conseiller.parrain_modifie': 'Parrain modifié',
  'candidature.soumise': 'Candidature de recrue soumise',
  'candidature.acceptee': 'Candidature acceptée',
  'candidature.refusee': 'Candidature refusée',
}

export function activityLabel(action: string): string {
  return ACTIVITY_LABELS[action] ?? action
}

export type ActivityEntry = {
  id: number
  actorRole: 'conseiller' | 'admin' | 'systeme'
  action: string
  details: Record<string, unknown>
  createdAt: string
  advisorName: string | null
}

// ---------- SCHEMAS ----------

const nameField = (label: string) =>
  z.string().trim().min(1, `${label} requis.`).max(80, `${label} trop long.`)

const phoneField = z
  .string()
  .trim()
  .min(1, 'Le téléphone est obligatoire.')
  .regex(phoneRegex, 'Numéro tunisien invalide (8 chiffres, préfixe +216 optionnel).')

const regionField = z.enum(REGIONS as [string, ...string[]], {
  message: 'Veuillez choisir une région.',
})

/** Admin: create an advisor directly (A1). No sponsor = founding advisor. */
export const createAdvisorSchema = z.object({
  prenom: nameField('Prénom'),
  nom: nameField('Nom'),
  email: z.email("L'adresse email n'est pas valide."),
  telephone: phoneField,
  region: regionField,
  gradeId: z.uuid('Veuillez choisir un grade.'),
  sponsorId: z.uuid().optional().or(z.literal('')),
})

/** Admin: edit identity and region (A5 from the admin side, B9). */
export const updateAdvisorSchema = z.object({
  prenom: nameField('Prénom'),
  nom: nameField('Nom'),
  telephone: phoneField,
  region: regionField,
})

/** Advisor: edit their own profile (A5). Email and region stay admin-managed. */
export const ownProfileSchema = z.object({
  prenom: nameField('Prénom'),
  nom: nameField('Nom'),
  telephone: phoneField,
})

/** Advisor: propose a recruit (B3). */
export const applicationSchema = z.object({
  prenom: nameField('Prénom'),
  nom: nameField('Nom'),
  email: z.email("L'adresse email n'est pas valide."),
  telephone: phoneField,
  region: regionField,
  notes: z.string().trim().max(1000, 'Note trop longue.').optional().or(z.literal('')),
})

export const passwordSchema = z
  .object({
    password: z.string().min(8, 'Le mot de passe doit contenir au moins 8 caractères.'),
    confirm: z.string(),
  })
  .refine((values) => values.password === values.confirm, {
    path: ['confirm'],
    message: 'Les deux mots de passe ne correspondent pas.',
  })

export const dateFormatter = new Intl.DateTimeFormat('fr-TN', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
})

export const dateTimeFormatter = new Intl.DateTimeFormat('fr-TN', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
})
