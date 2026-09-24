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
  'client.cree': 'Client créé',
  'client.modifie': 'Client modifié',
  'client.reattribue': 'Client réattribué',
  'vente.brouillon_cree': 'Bon de commande créé (brouillon)',
  'vente.brouillon_modifie': 'Brouillon modifié',
  'vente.brouillon_supprime': 'Brouillon supprimé',
  'vente.soumise': 'Bon de commande soumis',
  'vente.refusee': 'Bon de commande refusé',
  'vente.facturee': 'Facture émise',
  'vente.tranche_encaissee': 'Tranche encaissée',
  'vente.encaissement_annule': 'Encaissement annulé',
  'vente.echeancier_revise': 'Échéancier révisé',
  'vente.payee': 'Vente soldée',
  'vente.annulee': 'Vente annulée',
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

// ---------- CLIENTS ----------

/** The last 8 digits: how two spellings of one Tunisian number match. */
export function telephoneKey(telephone: string): string {
  return telephone.replace(/\D/g, '').slice(-8)
}

export const SEXE_LABELS: Record<'F' | 'H', string> = { F: 'Femme', H: 'Homme' }

export const clientSchema = z.object({
  prenom: nameField('Prénom'),
  nom: nameField('Nom'),
  telephone: phoneField,
  email: z.email("L'adresse email n'est pas valide.").optional().or(z.literal('')),
  adresse: z.string().trim().max(200, 'Adresse trop longue.'),
  ville: z.string().trim().max(80, 'Ville trop longue.'),
  gouvernorat: regionField,
  age: z
    .string()
    .trim()
    .regex(/^\d{0,3}$/, 'Âge invalide.')
    .refine((value) => value === '' || (Number(value) >= 15 && Number(value) <= 110), {
      message: "L'âge doit être compris entre 15 et 110 ans.",
    }),
  sexe: z.enum(['F', 'H', '']),
  notes: z.string().trim().max(1000, 'Note trop longue.').optional().or(z.literal('')),
})

export type ClientFormValues = z.infer<typeof clientSchema>

export type ClientListItem = {
  id: string
  prenom: string
  nom: string
  telephone: string
  email: string | null
  gouvernorat: string
  ville: string
  age: number | null
  sexe: 'F' | 'H' | null
  /** A client has at least one invoiced sale; everyone else is a prospect. */
  isClient: boolean
  /** Street and town filled in — required for home delivery. */
  hasAddress: boolean
  advisorId: string
  advisorName: string
  createdAt: string
}

// ---------- ORDER FORMS (BONS DE COMMANDE) ----------

export const SALE_STATUSES = [
  'brouillon',
  'a_facturer',
  'facture',
  'partiellement_paye',
  'paye',
  'annule',
] as const
export type SaleStatus = (typeof SALE_STATUSES)[number]

export const SALE_STATUS_LABELS: Record<SaleStatus, string> = {
  brouillon: 'Brouillon',
  a_facturer: 'À facturer',
  facture: 'Facturé',
  partiellement_paye: 'Partiellement payé',
  paye: 'Payé',
  annule: 'Annulé',
}

export const SALE_STATUS_CLASS: Record<SaleStatus, string> = {
  brouillon: 'badge-gray',
  a_facturer: 'badge-amber',
  facture: 'badge-blue',
  partiellement_paye: 'badge-amber',
  paye: 'badge-green',
  annule: 'badge-red',
}

export const INSTALLMENT_PAYMENT_METHODS = ['especes', 'cheque', 'virement', 'carte'] as const
export type InstallmentPaymentMethod = (typeof INSTALLMENT_PAYMENT_METHODS)[number]

export const INSTALLMENT_PAYMENT_LABELS: Record<InstallmentPaymentMethod, string> = {
  especes: 'Espèces',
  cheque: 'Chèque',
  virement: 'Virement',
  carte: 'Carte / TPE',
}

export type Installment = {
  id: string
  number: number
  amount: number
  dueDate: string
  paidAt: string | null
  paymentMethod: InstallmentPaymentMethod | null
  paymentNote: string | null
  /** Unpaid and past its due date — computed on read, never stored. */
  isLate: boolean
}

export function installmentCountLabel(count: number): string {
  return count <= 1 ? 'Comptant' : `${count} mensualités`
}

/** The browser sends only what to sell; every price is looked up server-side. */
export const orderFormSchema = z.object({
  clientId: z.uuid('Veuillez choisir un client.'),
  items: z
    .array(
      z.object({
        sku: z.string().min(1),
        quantity: z.number().int().min(1, 'Quantité invalide.').max(99, 'Quantité trop élevée.'),
      }),
    )
    .min(1, 'Ajoutez au moins un produit.')
    .max(30, 'Trop de lignes.'),
  deliveryMethod: z.enum(['domicile', 'boutique']),
  installmentCount: z.number().int().min(1).max(5),
  notes: z.string().trim().max(1000, 'Note trop longue.').optional().or(z.literal('')),
})

export type OrderFormValues = z.infer<typeof orderFormSchema>

export type SaleListItem = {
  reference: string
  saleStatus: SaleStatus
  clientId: string
  clientName: string
  advisorId: string
  advisorName: string
  totalDue: number
  paidAmount: number
  installmentCount: number
  hasLateInstallment: boolean
  createdAt: string
  submittedAt: string | null
  invoicedAt: string | null
}

export type SaleLine = {
  sku: string
  name: string
  quantity: number
  priceHT: number
  priceTTC: number
}

export type SaleDetail = SaleListItem & {
  id: string
  deliveryMethod: 'domicile' | 'boutique'
  deliveryStatus: string
  notes: string | null
  refusalReason: string | null
  cancelReason: string | null
  subtotalHT: number
  totalTVA: number
  totalTTC: number
  timbreFiscal: number
  deliveryFee: number
  paidAt: string | null
  cancelledAt: string | null
  client: {
    id: string
    prenom: string
    nom: string
    telephone: string
    email: string | null
    adresse: string
    ville: string
    gouvernorat: string
    hasAccount: boolean
  }
  items: SaleLine[]
  installments: Installment[]
}
