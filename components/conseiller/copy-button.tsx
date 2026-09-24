'use client'

import { useState } from 'react'
import { Check, Copy } from 'lucide-react'

export function CopyButton({ value, label = 'Copier' }: { value: string; label?: string }) {
  const [copied, setCopied] = useState(false)

  async function copy() {
    try {
      await navigator.clipboard.writeText(value)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // Clipboard access can be refused (insecure origin, permissions);
      // the value is on screen and can still be selected by hand.
    }
  }

  return (
    <button type="button" className="outline-button advisor-copy-button" onClick={copy}>
      {copied ? <Check size={15} /> : <Copy size={15} />}
      {copied ? 'Copié' : label}
    </button>
  )
}
