import { z } from 'zod'

export const productFormSchema = z.object({
  sku: z.string().trim().min(1, 'La référence est obligatoire.'),
  slug: z
    .string()
    .trim()
    .min(1, 'Le slug est obligatoire.')
    .regex(
      /^[a-z0-9]+(-[a-z0-9]+)*$/,
      'Minuscules, chiffres et tirets uniquement, sans accents ni espaces.',
    ),
  name: z.string().trim().min(1, 'Le nom est obligatoire.'),
  category: z.enum(['robot', 'accessoire'], { message: 'Choisissez une catégorie.' }),
  priceHT: z.number({ message: 'Prix HT invalide.' }).positive('Le prix HT doit être positif.'),
  tva: z.number({ message: 'TVA invalide.' }).min(0).max(1),
  priceTTC: z.number({ message: 'Prix TTC invalide.' }).positive('Le prix TTC doit être positif.'),
  shortDescription: z.string().trim().min(1, 'La description courte est obligatoire.'),
  description: z.string().trim().min(1, 'La description est obligatoire.'),
  // Objects, not bare strings — react-hook-form's useFieldArray requires
  // array items to be objects (each gets a stable RHF-managed `id`).
  features: z
    .array(z.object({ value: z.string().trim().min(1, 'Une caractéristique ne peut pas être vide.') }))
    .min(1, 'Ajoutez au moins une caractéristique.'),
  included: z.array(
    z.object({ value: z.string().trim().min(1, "Un élément inclus ne peut pas être vide.") }),
  ),
  sourceUrl: z.union([z.url('URL invalide.'), z.literal('')]),
  // Replaces the old in_stock checkbox: a real count, which the delivery
  // flow decrements. in_stock is derived from it by a DB trigger.
  //
  // Plain number, not z.coerce: coercion makes zod's input and output
  // types differ, which breaks react-hook-form's resolver generic. The
  // field registers with valueAsNumber instead.
  stockQuantity: z
    .number({ message: 'Quantité invalide.' })
    .int('La quantité doit être un nombre entier.')
    .min(0, 'La quantité ne peut pas être négative.')
    .max(100000),
  isFeatured: z.boolean(),
  sortOrder: z.number({ message: 'Ordre invalide.' }).int(),
})

export type ProductFormValues = z.infer<typeof productFormSchema>

export const emptyProductFormValues: ProductFormValues = {
  sku: '',
  slug: '',
  name: '',
  category: 'accessoire',
  priceHT: 0,
  tva: 0.19,
  priceTTC: 0,
  shortDescription: '',
  description: '',
  features: [{ value: '' }],
  included: [],
  sourceUrl: '',
  stockQuantity: 0,
  isFeatured: false,
  sortOrder: 0,
}
