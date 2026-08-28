'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { ArrowLeft, ArrowRight, Banknote, CreditCard, Home, Store } from 'lucide-react'
import { useCart } from '@/lib/cart-context'
import { checkoutFormSchema, type CheckoutFormValues } from '@/lib/checkout-schema'
import {
  formatPrice,
  governorates,
  TIMBRE_FISCAL,
  BOUTIQUE_ADDRESS,
  BOUTIQUE_ADDRESS_LABEL,
} from '@/lib/product-format'

/** Ties the detached submit button back to the form element. */
const FORM_ID = 'checkout-form'

type CheckoutPrefill = {
  prenom: string
  nom: string
  email: string
  telephone: string
  adresse: string
  ville: string
  gouvernorat: string
}

export function CheckoutForm({ prefill }: { prefill?: CheckoutPrefill }) {
  const router = useRouter()
  const { items, subtotalHT, totalTVA, totalTTC } = useCart()
  const [hydrated, setHydrated] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<CheckoutFormValues>({
    resolver: zodResolver(checkoutFormSchema),
    // Ordering requires an account, so we already know who this is: the
    // name from signup and, for a returning buyer, the delivery details
    // from their last order. Every field stays editable.
    defaultValues: {
      deliveryMethod: 'domicile',
      paymentMethod: 'cash',
      prenom: prefill?.prenom ?? '',
      nom: prefill?.nom ?? '',
      email: prefill?.email ?? '',
      telephone: prefill?.telephone ?? '',
      adresse: prefill?.adresse ?? '',
      ville: prefill?.ville ?? '',
      gouvernorat: prefill?.gouvernorat ?? '',
    },
  })

  const paymentMethod = watch('paymentMethod')
  const deliveryMethod = watch('deliveryMethod')
  // Remembers the customer's own address while "Retrait en boutique" has
  // temporarily replaced it with the boutique's, so switching back to home
  // delivery restores what they typed instead of leaving the boutique's
  // address behind.
  const [savedAddress, setSavedAddress] = useState({
    adresse: prefill?.adresse ?? '',
    ville: prefill?.ville ?? '',
    gouvernorat: prefill?.gouvernorat ?? '',
  })

  function handleDeliveryMethodChange(value: 'domicile' | 'boutique') {
    setValue('deliveryMethod', value)
    if (value === 'boutique') {
      setSavedAddress({
        adresse: watch('adresse'),
        ville: watch('ville'),
        gouvernorat: watch('gouvernorat'),
      })
      setValue('adresse', BOUTIQUE_ADDRESS.adresse, { shouldValidate: true })
      setValue('ville', BOUTIQUE_ADDRESS.ville, { shouldValidate: true })
      setValue('gouvernorat', BOUTIQUE_ADDRESS.gouvernorat, { shouldValidate: true })
    } else {
      setValue('adresse', savedAddress.adresse, { shouldValidate: true })
      setValue('ville', savedAddress.ville, { shouldValidate: true })
      setValue('gouvernorat', savedAddress.gouvernorat, { shouldValidate: true })
    }
  }

  useEffect(() => {
    setHydrated(true)
  }, [])

  useEffect(() => {
    if (hydrated && items.length === 0) {
      router.replace('/boutique')
    }
  }, [hydrated, items.length, router])

  async function onSubmit(values: CheckoutFormValues) {
    setSubmitError(null)
    setSubmitting(true)

    try {
      const response = await fetch('/api/commande', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customer: values,
          items: items.map((item) => ({
            sku: item.sku,
            slug: item.slug,
            quantity: item.quantity,
          })),
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        // The session can lapse between loading this page and submitting it.
        // Send them to sign in and back here; the cart is in localStorage,
        // so nothing is lost.
        if (response.status === 401 || data.requiresAuth) {
          router.push(`/compte/connexion?next=${encodeURIComponent('/commande')}`)
          return
        }
        setSubmitError(data.error ?? 'Une erreur est survenue. Merci de réessayer.')
        setSubmitting(false)
        return
      }

      if (data.redirectTo) {
        router.push(data.redirectTo)
        return
      }

      if (data.paymentUrl) {
        window.location.href = data.paymentUrl
        return
      }

      setSubmitError('Réponse inattendue du serveur. Merci de réessayer.')
      setSubmitting(false)
    } catch {
      setSubmitError('Impossible de contacter le serveur. Vérifiez votre connexion et réessayez.')
      setSubmitting(false)
    }
  }

  if (!hydrated || items.length === 0) {
    return <section className="checkout-page" />
  }

  return (
    <section className="checkout-page">
      <Link href="/panier" className="back-link">
        <ArrowLeft size={16} /> Retour au panier
      </Link>
      <p className="eyebrow">FINALISER VOTRE COMMANDE</p>
      <h1>On s&apos;occupe du reste.</h1>

      <div className="cart-layout">
        <form
          id={FORM_ID}
          className="checkout-form"
          onSubmit={handleSubmit(onSubmit)}
          noValidate
        >
          <h2>Mode de livraison</h2>
          <div className="payment-options">
            <label
              className={deliveryMethod === 'domicile' ? 'payment-card active' : 'payment-card'}
            >
              <input
                type="radio"
                value="domicile"
                checked={deliveryMethod === 'domicile'}
                onChange={() => handleDeliveryMethodChange('domicile')}
              />
              <span className="payment-card-icon">
                <Home size={18} />
              </span>
              <span>
                <strong>Livraison à domicile</strong>
                <small>Livré à l&apos;adresse que vous indiquez ci-dessous.</small>
              </span>
            </label>
            <label
              className={deliveryMethod === 'boutique' ? 'payment-card active' : 'payment-card'}
            >
              <input
                type="radio"
                value="boutique"
                checked={deliveryMethod === 'boutique'}
                onChange={() => handleDeliveryMethodChange('boutique')}
              />
              <span className="payment-card-icon">
                <Store size={18} />
              </span>
              <span>
                <strong>Récupération en boutique</strong>
                <small>{BOUTIQUE_ADDRESS_LABEL}</small>
              </span>
            </label>
          </div>
          {errors.deliveryMethod ? (
            <span className="field-error">{errors.deliveryMethod.message}</span>
          ) : null}

          <h2>Vos coordonnées</h2>
          <div className="form-grid">
            <label>
              Prénom
              <input
                placeholder="Votre prénom"
                {...register('prenom')}
                aria-invalid={!!errors.prenom}
              />
              {errors.prenom ? <span className="field-error">{errors.prenom.message}</span> : null}
            </label>
            <label>
              Nom
              <input placeholder="Votre nom" {...register('nom')} aria-invalid={!!errors.nom} />
              {errors.nom ? <span className="field-error">{errors.nom.message}</span> : null}
            </label>
            <label>
              Email
              <input
                type="email"
                placeholder="vous@exemple.com"
                {...register('email')}
                aria-invalid={!!errors.email}
              />
              {errors.email ? <span className="field-error">{errors.email.message}</span> : null}
            </label>
            <label>
              Téléphone
              <input
                placeholder="+216 00 000 000"
                {...register('telephone')}
                aria-invalid={!!errors.telephone}
              />
              {errors.telephone ? (
                <span className="field-error">{errors.telephone.message}</span>
              ) : null}
            </label>
            {deliveryMethod === 'boutique' ? (
              <div className="wide checkout-pickup-notice">
                <Store size={16} />
                <span>
                  Votre commande vous attendra à l&apos;adresse ci-dessus. Aucune adresse de
                  livraison n&apos;est nécessaire.
                </span>
              </div>
            ) : (
              <>
                <label className="wide">
                  Adresse
                  <input
                    placeholder="Rue, numéro, appartement"
                    {...register('adresse')}
                    aria-invalid={!!errors.adresse}
                  />
                  {errors.adresse ? (
                    <span className="field-error">{errors.adresse.message}</span>
                  ) : null}
                </label>
                <label>
                  Ville
                  <input
                    placeholder="Votre ville"
                    {...register('ville')}
                    aria-invalid={!!errors.ville}
                  />
                  {errors.ville ? (
                    <span className="field-error">{errors.ville.message}</span>
                  ) : null}
                </label>
                <label>
                  Gouvernorat
                  {/* No defaultValue here: it would override the value
                      react-hook-form was given, leaving a returning customer's
                      saved gouvernorat showing "Sélectionner". */}
                  <select {...register('gouvernorat')} aria-invalid={!!errors.gouvernorat}>
                    <option value="" disabled>
                      Sélectionner
                    </option>
                    {governorates.map((g) => (
                      <option key={g} value={g}>
                        {g}
                      </option>
                    ))}
                  </select>
                  {errors.gouvernorat ? (
                    <span className="field-error">{errors.gouvernorat.message}</span>
                  ) : null}
                </label>
              </>
            )}
            <label className="wide">
              Notes de commande
              <textarea
                rows={3}
                placeholder="Précisions pour la livraison (optionnel)"
                {...register('notes')}
              />
            </label>
          </div>

          <h2>Mode de paiement</h2>
          <div className="payment-options">
            <label className={paymentMethod === 'cash' ? 'payment-card active' : 'payment-card'}>
              <input type="radio" value="cash" {...register('paymentMethod')} />
              <span className="payment-card-icon">
                <Banknote size={18} />
              </span>
              <span>
                <strong>Paiement à la livraison</strong>
                <small>Payez en espèces à la réception de votre commande.</small>
              </span>
            </label>
            {/* Online payment is not implemented yet: shown as disabled so the
                option stays visible without being selectable. */}
            <label className="payment-card disabled" aria-disabled="true">
              <input type="radio" value="online" disabled {...register('paymentMethod')} />
              <span className="payment-card-icon">
                <CreditCard size={18} />
              </span>
              <span>
                <strong>
                  Paiement en ligne <em className="soon-badge">Bientôt disponible</em>
                </strong>
                <small>Le paiement par carte bancaire sera disponible prochainement.</small>
              </span>
            </label>
          </div>
          {errors.paymentMethod ? (
            <span className="field-error">{errors.paymentMethod.message}</span>
          ) : null}

        </form>

        {/* Outside the <form> on purpose, wired back to it by the `form`
            attribute — a submit button anywhere in the document still
            submits the form it names. That makes it a sibling of the
            summary card, which is the only way the one-column phone
            layout can order it *after* the card. */}
        <div className="checkout-submit">
          {submitError ? <p className="form-error">{submitError}</p> : null}

          <button
            className="primary-button"
            type="submit"
            form={FORM_ID}
            disabled={submitting}
          >
            {submitting
              ? 'Traitement en cours…'
              : paymentMethod === 'online'
                ? 'Procéder au paiement'
                : 'Confirmer la commande'}{' '}
            <ArrowRight size={17} />
          </button>
        </div>

        <aside className="summary">
          <h2>Votre commande</h2>
          {items.map((item) => (
            <div key={item.slug}>
              <span>
                {item.name} × {item.quantity}
              </span>
              <strong>{formatPrice(item.priceTTC * item.quantity)}</strong>
            </div>
          ))}
          <hr />
          <div>
            <span>Sous-total HT</span>
            <strong>{formatPrice(subtotalHT)}</strong>
          </div>
          <div>
            <span>TVA (19%)</span>
            <strong>{formatPrice(totalTVA)}</strong>
          </div>
          <div>
            <span>Total TTC</span>
            <strong>{formatPrice(totalTTC)}</strong>
          </div>
          {paymentMethod === 'cash' ? (
            <div>
              <span>Timbre fiscal</span>
              <strong>{formatPrice(TIMBRE_FISCAL)}</strong>
            </div>
          ) : null}
          <hr />
          <div className="summary-total">
            <span>Total à payer</span>
            <strong>
              {formatPrice(paymentMethod === 'cash' ? totalTTC + TIMBRE_FISCAL : totalTTC)}
            </strong>
          </div>
        </aside>
      </div>
    </section>
  )
}
