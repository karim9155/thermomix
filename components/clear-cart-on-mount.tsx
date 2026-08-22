'use client'

import { useEffect, useRef } from 'react'
import { useCart } from '@/lib/cart-context'

export function ClearCartOnMount() {
  const { clearCart } = useCart()
  const cleared = useRef(false)

  useEffect(() => {
    if (cleared.current) return
    cleared.current = true
    clearCart()
  }, [clearCart])

  return null
}
