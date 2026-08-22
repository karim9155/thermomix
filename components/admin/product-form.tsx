'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useFieldArray, useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { ArrowRight, GripVertical, Plus, Trash2 } from 'lucide-react'
import {
  productFormSchema,
  type ProductFormValues,
} from '@/lib/admin/product-schema'
import { createProductAction, updateProductAction } from '@/app/admin-r/(dashboard)/produits/actions'
import type { AdminProductImage } from '@/lib/admin/products'
import { ProductImageManager } from '@/components/admin/product-image-manager'
import { HardDeleteDialog } from '@/components/admin/hard-delete-dialog'

function RepeatableList({
  label,
  name,
  helperText,
  fields,
  append,
  remove,
  move,
  register,
  errors,
}: {
  label: string
  name: 'features' | 'included'
  helperText?: string
  fields: { id: string }[]
  append: (value: { value: string }) => void
  remove: (index: number) => void
  move: (from: number, to: number) => void
  register: any
  errors: any
}) {
  return (
    <div className="admin-repeatable">
      <div className="admin-repeatable-heading">
        <span>{label}</span>
        {helperText ? <small>{helperText}</small> : null}
      </div>
      {fields.map((field, index) => (
        <div className="admin-repeatable-row" key={field.id}>
          <GripVertical size={15} className="admin-repeatable-grip" />
          <input {...register(`${name}.${index}.value` as const)} />
          <button
            type="button"
            className="icon-button"
            aria-label="Monter"
            disabled={index === 0}
            onClick={() => move(index, index - 1)}
          >
            ↑
          </button>
          <button
            type="button"
            className="icon-button"
            aria-label="Descendre"
            disabled={index === fields.length - 1}
            onClick={() => move(index, index + 1)}
          >
            ↓
          </button>
          <button
            type="button"
            className="icon-button"
            aria-label="Supprimer cette ligne"
            onClick={() => remove(index)}
          >
            <Trash2 size={15} />
          </button>
        </div>
      ))}
      <button
        type="button"
        className="outline-button admin-repeatable-add"
        onClick={() => append({ value: '' })}
      >
        <Plus size={15} /> Ajouter une ligne
      </button>
      {errors?.[name]?.message ? <span className="field-error">{errors[name]?.message}</span> : null}
    </div>
  )
}

export function ProductForm({
  mode,
  initialValues,
  productId,
  images,
}: {
  mode: 'create' | 'edit'
  initialValues: ProductFormValues
  productId?: string
  images?: AdminProductImage[]
}) {
  const router = useRouter()
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)

  const {
    register,
    handleSubmit,
    setValue,
    getValues,
    control,
    formState: { errors, isSubmitting },
  } = useForm<ProductFormValues>({
    resolver: zodResolver(productFormSchema),
    defaultValues: initialValues,
  })

  const featureFields = useFieldArray({ control, name: 'features' })
  const includedFields = useFieldArray({ control, name: 'included' })

  function handlePriceHTChange(event: React.ChangeEvent<HTMLInputElement>) {
    const ht = Number(event.target.value)
    const tva = Number(getValues('tva')) || 0
    if (Number.isFinite(ht)) {
      setValue('priceTTC', Math.round(ht * (1 + tva) * 100) / 100)
    }
  }

  async function onSubmit(values: ProductFormValues) {
    setSubmitError(null)
    setSaved(false)

    const result =
      mode === 'create'
        ? await createProductAction(values)
        : await updateProductAction(initialValues.sku, initialValues.slug, values)

    if (result.error) {
      setSubmitError(result.error)
      return
    }

    if (mode === 'create') {
      router.push(`/admin-r/produits/${values.sku}`)
    } else {
      setSaved(true)
      router.refresh()
    }
  }

  return (
    <form className="admin-product-form" onSubmit={handleSubmit(onSubmit)} noValidate>
      <section className="admin-card">
        <h2>Informations générales</h2>
        <div className="form-grid">
          <label>
            Référence (SKU)
            <input
              {...register('sku')}
              readOnly={mode === 'edit'}
              className={mode === 'edit' ? 'admin-input-locked' : ''}
              aria-invalid={!!errors.sku}
            />
            {mode === 'edit' ? (
              <small>La référence est la clé du dossier de stockage — non modifiable.</small>
            ) : null}
            {errors.sku ? <span className="field-error">{errors.sku.message}</span> : null}
          </label>

          <label>
            Slug (URL publique)
            <input {...register('slug')} aria-invalid={!!errors.slug} />
            <small>Modifier le slug change l&apos;adresse publique du produit.</small>
            {errors.slug ? <span className="field-error">{errors.slug.message}</span> : null}
          </label>

          <label className="wide">
            Nom
            <input {...register('name')} aria-invalid={!!errors.name} />
            {errors.name ? <span className="field-error">{errors.name.message}</span> : null}
          </label>

          <label>
            Catégorie
            <select {...register('category')} aria-invalid={!!errors.category}>
              <option value="robot">Thermomix® TM7</option>
              <option value="accessoire">Accessoire</option>
            </select>
          </label>

          <label>
            Ordre d&apos;affichage
            <input
              type="number"
              {...register('sortOrder', { valueAsNumber: true })}
              aria-invalid={!!errors.sortOrder}
            />
          </label>

          <label>
            Prix HT (TND)
            <input
              type="number"
              step="0.001"
              {...register('priceHT', { valueAsNumber: true, onChange: handlePriceHTChange })}
              aria-invalid={!!errors.priceHT}
            />
            {errors.priceHT ? <span className="field-error">{errors.priceHT.message}</span> : null}
          </label>

          <label>
            TVA
            <input
              type="number"
              step="0.01"
              {...register('tva', { valueAsNumber: true })}
              aria-invalid={!!errors.tva}
            />
          </label>

          <label>
            Prix TTC (TND)
            <input
              type="number"
              step="0.01"
              {...register('priceTTC', { valueAsNumber: true })}
              aria-invalid={!!errors.priceTTC}
            />
            <small>Se remplit depuis le prix HT — modifiable pour un prix rond.</small>
            {errors.priceTTC ? <span className="field-error">{errors.priceTTC.message}</span> : null}
          </label>

          <label>
            URL source (référence interne)
            <input {...register('sourceUrl')} />
            {errors.sourceUrl ? <span className="field-error">{errors.sourceUrl.message}</span> : null}
          </label>

          <label className="admin-checkbox">
            <input type="checkbox" {...register('inStock')} />
            En stock
          </label>
          <label className="admin-checkbox">
            <input type="checkbox" {...register('isFeatured')} />
            Mis en avant sur la page d&apos;accueil
          </label>
        </div>
      </section>

      <section className="admin-card">
        <h2>Descriptions</h2>
        <div className="form-grid">
          <label className="wide">
            Description courte
            <input {...register('shortDescription')} aria-invalid={!!errors.shortDescription} />
            {errors.shortDescription ? (
              <span className="field-error">{errors.shortDescription.message}</span>
            ) : null}
          </label>
          <label className="wide">
            Description complète
            <textarea rows={6} {...register('description')} aria-invalid={!!errors.description} />
            <small>Une ligne vide sépare les paragraphes.</small>
            {errors.description ? (
              <span className="field-error">{errors.description.message}</span>
            ) : null}
          </label>
        </div>

        <RepeatableList
          label="Caractéristiques"
          name="features"
          fields={featureFields.fields}
          append={(v) => featureFields.append(v)}
          remove={featureFields.remove}
          move={featureFields.move}
          register={register}
          errors={errors}
        />

        <RepeatableList
          label="Contenu inclus"
          name="included"
          helperText="optionnel"
          fields={includedFields.fields}
          append={(v) => includedFields.append(v)}
          remove={includedFields.remove}
          move={includedFields.move}
          register={register}
          errors={errors}
        />
      </section>

      {mode === 'edit' && productId ? (
        <section className="admin-card">
          <h2>Images</h2>
          <ProductImageManager productId={productId} sku={initialValues.sku} images={images ?? []} />
        </section>
      ) : null}

      {submitError ? <p className="form-error">{submitError}</p> : null}
      {saved ? <p className="admin-saved-message">Enregistré.</p> : null}

      <div className="admin-form-actions">
        <Link href="/admin-r/produits" className="outline-button">
          Retour à la liste
        </Link>
        <button className="primary-button" type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'Enregistrement…' : 'Enregistrer'} <ArrowRight size={17} />
        </button>
      </div>

      {mode === 'edit' ? (
        <section className="admin-card admin-danger-zone">
          <h2>Zone de danger</h2>
          <p>
            La suppression définitive retire aussi les images du produit. Préférez
            l&apos;archivage depuis la liste des produits pour un retrait réversible.
          </p>
          <HardDeleteDialog sku={initialValues.sku} slug={initialValues.slug} />
        </section>
      ) : null}
    </form>
  )
}
