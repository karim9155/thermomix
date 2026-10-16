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
  'remuneration.regle_modifiee': 'Montants de rémunération modifiés',
  'remuneration.ajustement': 'Ajustement de rémunération',
  'remuneration.periode_cloturee': 'Mois de rémunération clôturé',
  'remuneration.versement': 'Rémunération versée',
  'remuneration.versement_annule': 'Versement annulé',
  'parrainage.commande_reattribuee': 'Commande en ligne réattribuée',
  'parrainage.code_regenere': "Code d'affiliation régénéré",
  'parrainage.code_active': "Code d'affiliation activé",
  'parrainage.code_desactive': "Code d'affiliation désactivé",
  'grade.cree': 'Grade créé',
  'grade.modifie': 'Grade modifié',
  'grade.archive': 'Grade archivé',
  'grade.restaure': 'Grade restauré',
  'challenge.cree': 'Challenge créé',
  'challenge.modifie': 'Challenge modifié',
  'challenge.publie': 'Challenge publié',
  'challenge.depublie': 'Challenge dépublié',
  'challenge.supprime': 'Challenge supprimé',
  'challenge.cloture': 'Challenge clôturé',
  'challenge.gagne': 'Challenge gagné',
  'atelier.planifie': 'Atelier planifié',
  'atelier.modifie': 'Atelier modifié',
  'atelier.annule': 'Atelier annulé',
  'atelier.effectue': 'Atelier effectué (rapport saisi)',
  'atelier.rapport_modifie': "Rapport d'atelier modifié",
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

/**
 * The advisor's matricule: exactly 8 digits, chosen by the admin and
 * fixed for life (migration 0020). Kept as a string so a leading zero
 * survives — it identifies an advisor, it is not a number to count with.
 */
export const matriculeField = z
  .string()
  .trim()
  .regex(/^[0-9]{8}$/, 'Le matricule doit comporter exactement 8 chiffres.')

/** Admin: create an advisor directly (A1). No sponsor = founding advisor. */
export const createAdvisorSchema = z.object({
  prenom: nameField('Prénom'),
  nom: nameField('Nom'),
  email: z.email("L'adresse email n'est pas valide."),
  telephone: phoneField,
  matricule: matriculeField,
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

// Pinned to Tunis time: the server runs in UTC (Vercel), and without a
// time zone every time shown would be an hour early — a 10:00 workshop
// displayed as 09:00. hourCycle h23: fr-TN otherwise writes "06:30 PM".
export const dateFormatter = new Intl.DateTimeFormat('fr-TN', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
  timeZone: 'Africa/Tunis',
})

export const dateTimeFormatter = new Intl.DateTimeFormat('fr-TN', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
  timeZone: 'Africa/Tunis',
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

/**
 * A customer ACCOUNT tied to an advisor by affiliation (domain I), as
 * opposed to a ClientListItem, which an advisor entered by hand.
 *
 * Keyed by user_id because there is no clients row behind it: the
 * identity comes from the customer's profile, falling back to their
 * latest order when the profile is still empty.
 */
export type AffiliatedCustomerItem = {
  userId: string
  prenom: string
  nom: string
  telephone: string
  email: string | null
  ville: string
  gouvernorat: string
  advisorId: string
  advisorName: string
  /** 'lien' covers both the shared link and the code typed at checkout. */
  source: 'lien' | 'admin'
  orders: number
  paidOrders: number
  /** When the winning link was opened, or when the admin set this. */
  since: string
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
  // The workshop this sale came out of, if any (E5). Ownership is checked
  // server-side, like the client's.
  workshopId: z.uuid().optional().or(z.literal('')),
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
  workshopId: string | null
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

// ---------- REMUNERATION ----------

export type CommissionKind = 'vente' | 'recrutement' | 'challenge' | 'ajustement' | 'report'

export const COMMISSION_KIND_LABELS: Record<CommissionKind, string> = {
  vente: 'Prime de vente',
  recrutement: 'Bonus de recrutement',
  challenge: 'Challenge',
  ajustement: 'Ajustement',
  report: 'Report',
}

export const PAYOUT_METHODS = ['virement', 'especes', 'cheque'] as const
export type PayoutMethod = (typeof PAYOUT_METHODS)[number]

export const PAYOUT_METHOD_LABELS: Record<PayoutMethod, string> = {
  virement: 'Virement',
  especes: 'Espèces',
  cheque: 'Chèque',
}

export type CommissionEntry = {
  id: number
  advisorId: string
  month: string
  kind: CommissionKind
  amount: number
  eventDate: string
  label: string
  orderReference: string | null
  createdAt: string
}

export type CommissionRule = {
  id: string
  gradeId: string
  gradeName: string
  gradeRank: number
  robotSaleBonus: number
  recruitmentBonus: number
  effectiveFrom: string
}

export type PeriodSummary = {
  month: string
  status: 'ouverte' | 'cloturee'
  closedAt: string | null
  payday: string
  total: number
  /** Advisors with a positive balance to pay this month. */
  advisorCount: number
  paidCount: number
  paidTotal: number
}

export type PeriodAdvisorTotal = {
  advisorId: string
  advisorName: string
  telephone: string
  byKind: Partial<Record<CommissionKind, number>>
  total: number
  payout: {
    amount: number
    paidAt: string
    method: PayoutMethod | null
    reference: string | null
  } | null
}

const monthFormatter = new Intl.DateTimeFormat('fr-FR', {
  month: 'long',
  year: 'numeric',
  timeZone: 'UTC',
})

/** '2026-09-01' → 'septembre 2026'. */
export function formatMonth(month: string): string {
  return monthFormatter.format(new Date(`${month.slice(0, 10)}T12:00:00Z`))
}

/** Signed dinars with millimes: '+450,000 TND', '−450,000 TND'. */
export function formatAmount(amount: number, signed = false): string {
  const [whole, decimals] = Math.abs(amount).toFixed(3).split('.')
  const spaced = whole.replace(/\B(?=(\d{3})+(?!\d))/g, ' ')
  const sign = amount < 0 ? '−' : signed && amount > 0 ? '+' : ''
  return `${sign}${spaced},${decimals} TND`
}

// ---------- GRADES (phase 5) ----------

export type GradeCriteria = {
  minRevenue: number
  minSales: number
  minRecruits: number
  periodMonths: number
}

export type GradeDetail = {
  id: string
  name: string
  rank: number
  description: string | null
  isArchived: boolean
  criteria: GradeCriteria
  advisorCount: number
}

/** "450", "450,5", "1 200" → number; '' → 0. */
const amountField = (label: string) =>
  z
    .string()
    .trim()
    .transform((value) => value.replace(/\s/g, '').replace(',', '.'))
    .refine((value) => value === '' || /^\d+(\.\d{1,3})?$/.test(value), `${label} invalide.`)
    .transform((value) => (value === '' ? 0 : Number(value)))

const countField = (label: string) =>
  z
    .string()
    .trim()
    .refine((value) => value === '' || /^\d{1,6}$/.test(value), `${label} invalide.`)
    .transform((value) => (value === '' ? 0 : Number(value)))

export const gradeSchema = z.object({
  name: z.string().trim().min(2, 'Nom requis.').max(60, 'Nom trop long.'),
  rank: z
    .string()
    .trim()
    .regex(/^\d{1,3}$/, 'Rang invalide.')
    .transform(Number)
    .refine((value) => value >= 1, 'Le rang commence à 1.'),
  description: z.string().trim().max(300, 'Description trop longue.').optional().or(z.literal('')),
  minRevenue: amountField("Chiffre d'affaires"),
  minSales: countField('Nombre de ventes'),
  minRecruits: countField('Nombre de recrues'),
  periodMonths: z
    .string()
    .trim()
    .regex(/^\d{1,2}$/, 'Période invalide.')
    .transform(Number)
    .refine((value) => value >= 1 && value <= 24, 'La période va de 1 à 24 mois.'),
})

export type GradeFormValues = z.infer<typeof gradeSchema>

export const newGradeSchema = gradeSchema.extend({
  robotSaleBonus: amountField('Prime par Thermomix'),
  recruitmentBonus: amountField('Bonus de recrutement'),
})

// ---------- CHALLENGES (phase 5) ----------

export const CHALLENGE_METRICS = ['ventes', 'robots', 'ca', 'recrues'] as const
export type ChallengeMetric = (typeof CHALLENGE_METRICS)[number]

export const CHALLENGE_METRIC_LABELS: Record<ChallengeMetric, string> = {
  ventes: 'Nombre de ventes',
  robots: 'Thermomix vendus',
  ca: "Chiffre d'affaires (TTC)",
  recrues: 'Recrues activées',
}

export type ChallengeStatus = 'brouillon' | 'publie' | 'cloture'

export const CHALLENGE_STATUS_LABELS: Record<ChallengeStatus, string> = {
  brouillon: 'Brouillon',
  publie: 'Publié',
  cloture: 'Clôturé',
}

export const CHALLENGE_STATUS_CLASS: Record<ChallengeStatus, string> = {
  brouillon: 'badge-gray',
  publie: 'badge-green',
  cloture: 'badge-blue',
}

export type Challenge = {
  id: string
  title: string
  description: string | null
  imageUrl: string | null
  metric: ChallengeMetric
  target: number | null
  winnersCount: number | null
  rewardLabel: string | null
  prizeAmount: number
  startsOn: string
  endsOn: string
  status: ChallengeStatus
  closedAt: string | null
}

export type RankingRow = {
  advisorId: string
  name: string
  score: number
  /** Standard competition ranking: ties share a rank (1, 2, 2, 4). */
  rank: number
  reachedTarget: boolean
}

export function formatScore(metric: ChallengeMetric, value: number): string {
  return metric === 'ca' ? formatAmount(value) : String(Math.round(value))
}

export const challengeSchema = z
  .object({
    title: z.string().trim().min(3, 'Titre requis.').max(120, 'Titre trop long.'),
    description: z.string().trim().max(2000, 'Description trop longue.').optional().or(z.literal('')),
    metric: z.enum(CHALLENGE_METRICS, { message: 'Choisissez un objectif.' }),
    target: z
      .string()
      .trim()
      .transform((value) => value.replace(/\s/g, '').replace(',', '.'))
      .refine((value) => value === '' || /^\d+(\.\d{1,3})?$/.test(value), 'Seuil invalide.')
      .transform((value) => (value === '' || Number(value) === 0 ? null : Number(value))),
    winnersCount: z
      .string()
      .trim()
      .refine((value) => value === '' || /^\d{1,3}$/.test(value), 'Nombre de gagnants invalide.')
      .transform((value) => (value === '' || Number(value) === 0 ? null : Number(value))),
    rewardLabel: z.string().trim().max(200, 'Récompense trop longue.').optional().or(z.literal('')),
    prizeAmount: amountField('Prime'),
    startsOn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date de début invalide.'),
    endsOn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date de fin invalide.'),
  })
  .refine((values) => values.endsOn >= values.startsOn, {
    path: ['endsOn'],
    message: 'La fin doit être après le début.',
  })
  .refine((values) => values.target !== null || values.winnersCount !== null, {
    path: ['winnersCount'],
    message: 'Indiquez un seuil à atteindre, un nombre de gagnants, ou les deux.',
  })

export type ChallengeFormValues = z.infer<typeof challengeSchema>

// ---------- WORKSHOPS (phase 6) ----------

export type WorkshopStatus = 'planifie' | 'effectue' | 'annule'

export const WORKSHOP_STATUS_LABELS: Record<WorkshopStatus, string> = {
  planifie: 'Planifié',
  effectue: 'Effectué',
  annule: 'Annulé',
}

export const WORKSHOP_STATUS_CLASS: Record<WorkshopStatus, string> = {
  planifie: 'badge-blue',
  effectue: 'badge-green',
  annule: 'badge-red',
}

export type Workshop = {
  id: string
  advisorId: string
  advisorName: string
  hostClientId: string | null
  hostName: string | null
  scheduledAt: string
  location: string
  gouvernorat: string
  invitedCount: number
  notes: string | null
  status: WorkshopStatus
  cancelReason: string | null
  attendeesCount: number | null
  contactsCount: number | null
  feedback: string | null
  observations: string | null
  reportedAt: string | null
  /** Invoiced (not cancelled) order forms linked to this workshop (E5). */
  salesCount: number
  salesTotal: number
}

/**
 * A <input type="datetime-local"> value is a wall-clock time with no zone.
 * The shop is in Tunis, UTC+1 all year, so the offset is fixed.
 */
export function tunisLocalToIso(value: string): string {
  return `${value}:00+01:00`
}

/** The reverse, for prefilling an input: an instant shown in Tunis time. */
export function isoToTunisLocal(iso: string): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Africa/Tunis',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(new Date(iso))
  const get = (type: string) => parts.find((part) => part.type === type)?.value ?? '00'
  return `${get('year')}-${get('month')}-${get('day')}T${get('hour')}:${get('minute')}`
}

const smallCount = (label: string) =>
  z
    .string()
    .trim()
    .refine((value) => value === '' || /^\d{1,4}$/.test(value), `${label} invalide.`)
    .transform((value) => (value === '' ? 0 : Number(value)))

export const workshopSchema = z.object({
  hostClientId: z.uuid().or(z.literal('')),
  scheduledAt: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/, 'Date et heure invalides.'),
  location: z.string().trim().min(3, 'Indiquez le lieu.').max(200, 'Lieu trop long.'),
  gouvernorat: regionField,
  invitedCount: smallCount("Nombre d'invités"),
  notes: z.string().trim().max(1000, 'Notes trop longues.').optional().or(z.literal('')),
})

export type WorkshopFormValues = z.infer<typeof workshopSchema>

/** The report written once the workshop took place (E4). */
export const workshopReportSchema = z.object({
  attendeesCount: smallCount('Nombre de présents'),
  contactsCount: smallCount('Nombre de contacts'),
  feedback: z.string().trim().max(2000, 'Texte trop long.').optional().or(z.literal('')),
  observations: z.string().trim().max(2000, 'Texte trop long.').optional().or(z.literal('')),
})

export type WorkshopReportValues = z.infer<typeof workshopReportSchema>
