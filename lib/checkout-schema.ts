import { z } from 'zod'
import { governorates } from '@/lib/product-format'

const phoneRegex = /^(\+216[\s]?)?\d{2}[\s]?\d{3}[\s]?\d{3}$/

export const checkoutFormSchema = z
  .object({
    nom: z.string().trim().min(2, 'Le nom doit contenir au moins 2 caractères.'),
    prenom: z.string().trim().min(2, 'Le prénom doit contenir au moins 2 caractères.'),
    telephone: z
      .string()
      .trim()
      .min(1, 'Le téléphone est obligatoire.')
      .regex(phoneRegex, 'Numéro tunisien invalide (8 chiffres, préfixe +216 optionnel).'),
    email: z.email("L'adresse email n'est pas valide.").optional().or(z.literal('')),
    adresse: z.string().trim().min(1, "L'adresse est obligatoire."),
    ville: z.string().trim().min(1, 'La ville est obligatoire.'),
    gouvernorat: z.enum(governorates as [string, ...string[]], {
      message: 'Veuillez sélectionner un gouvernorat.',
    }),
    notes: z.string().trim().optional().or(z.literal('')),
    paymentMethod: z.enum(['cash', 'online'], {
      message: 'Veuillez choisir un mode de paiement.',
    }),
  })
  // 'online' stays in the enum (existing orders and the admin UI still use it),
  // but is rejected until online payment ships. superRefine validates without
  // narrowing the inferred type to 'cash', which the form's resolver relies on.
  // Delete this block to re-enable online payment.
  .superRefine((values, ctx) => {
    if (values.paymentMethod === 'online') {
      ctx.addIssue({
        code: 'custom',
        path: ['paymentMethod'],
        message: "Le paiement en ligne n'est pas encore disponible.",
      })
    }
  })

export type CheckoutFormValues = z.infer<typeof checkoutFormSchema>

export const orderLineSchema = z.object({
  sku: z.string().min(1),
  slug: z.string().min(1),
  quantity: z.number().int().min(1),
})

export const createOrderSchema = z.object({
  customer: checkoutFormSchema,
  items: z.array(orderLineSchema).min(1, 'Le panier est vide.'),
})

export type CreateOrderPayload = z.infer<typeof createOrderSchema>
