'use client'

import { useActionState } from 'react'
import { saveCommentAction, type CommentState } from '@/app/conseiller/(espace)/journal/actions'

/** The advisor's optional comment on one day (J2). Empty clears it. */
export function JournalComment({ day, comment }: { day: string; comment: string | null }) {
  const [state, action, pending] = useActionState(saveCommentAction.bind(null, day), {} as CommentState)

  return (
    <form action={action} className="journal-comment-form">
      <textarea
        name="comment"
        rows={2}
        defaultValue={comment ?? ''}
        placeholder="Mon commentaire sur la journée (facultatif)"
        maxLength={2000}
      />
      <div className="advisor-inline-form journal-comment-actions">
        <button type="submit" className="outline-button advisor-small-button" disabled={pending}>
          {pending ? 'Enregistrement…' : 'Enregistrer'}
        </button>
        {state.error ? <span className="field-error">{state.error}</span> : null}
        {state.success ? <span className="admin-saved-message">Enregistré.</span> : null}
      </div>
    </form>
  )
}
