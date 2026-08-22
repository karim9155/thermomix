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
  inStock: z.boolean(),
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
  inStock: true,
  isFeatured: false,
  sortOrder: 0,
}
