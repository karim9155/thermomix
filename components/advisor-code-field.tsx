'use client'

import { useState, useTransition } from 'react'
import { BadgeCheck } from 'lucide-react'
import { checkAdvisorCodeAction } from '@/app/commande/actions'

/**
 * Optional advisor code at checkout (I2). Checks the code as soon as the
 * customer leaves the field or presses "Appliquer", so they see which
 * advisor it belongs to before ordering. The value itself is sent with
 * the order and checked again on the server — this check is display only.
 */
export function AdvisorCodeField({
  value,
  onChange,
  currentAdvisorName,
}: {
  value: string
  onChange: (value: string) => void
  /** Who the order would go to without a code, if anyone. */
  currentAdvisorName: string | null
}) {
  const [checked, setChecked] = useState<{ code: string; name?: string; error?: string } | null>(null)
  const [pending, startTransition] = useTransition()

  function check() {
    const code = value.trim()
    if (!code || checked?.code === code) return
    startTransition(async () => {
      const result = await checkAdvisorCodeAction(code)
      setChecked({ code, ...result })
    })
  }

  // The result only applies to what is still in the field.
  const current = checked && checked.code === value.trim() ? checked : null

  return (
    <div className="advisor-code-field">
      <label htmlFor="advisor-code">Code conseiller (facultatif)</label>
      <div className="advisor-code-input">
        <input
          id="advisor-code"
          value={value}
          onChange={(event) => onChange(event.target.value.toUpperCase())}
          onBlur={check}
          onKeyDown={(event) => {
            // Enter applies the code instead of submitting the whole order.
            if (event.key === 'Enter') {
              event.preventDefault()
              check()
            }
          }}
          placeholder="Ex. KARIM-7Q4X"
          autoComplete="off"
          spellCheck={false}
          maxLength={40}
          aria-invalid={current?.error ? true : undefined}
        />
        <button type="button" className="outline-button" onClick={check} disabled={pending || !value.trim()}>
          {pending ? 'Vérification…' : 'Appliquer'}
        </button>
      </div>

      {current?.name ? (
        <p className="advisor-code-ok">
          <BadgeCheck size={15} /> Conseiller : {current.name}
        </p>
      ) : current?.error ? (
        <span className="field-error">{current.error}</span>
      ) : !value.trim() && currentAdvisorName ? (
        <p className="advisor-code-ok">
          <BadgeCheck size={15} /> Vous êtes accompagné(e) par {currentAdvisorName}. Saisissez un
          autre code pour changer de conseiller.
        </p>
      ) : (
        <small>Si un conseiller INOCASA vous a donné son code, saisissez-le ici.</small>
      )}
    </div>
  )
}
