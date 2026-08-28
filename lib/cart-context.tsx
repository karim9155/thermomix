'use client'

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import type { Product, ProductCategory } from '@/lib/product-format'

export type CartItem = {
  sku: string
  slug: string
  name: string
  priceTTC: number
  priceHT: number
  image: string
  quantity: number
  /** Drives the home-delivery fee (see calculateDeliveryFee). Carts saved
      before this field existed hydrate without it, so it is optional and
      normalized to 'accessoire' on load — the cheaper rate, so a stale
      cart never over-charges someone. The server recomputes the fee from
      the real catalog anyway. */
  category?: ProductCategory
}

type CartContextValue = {
  items: CartItem[]
  addItem: (product: Product, quantity?: number) => void
  removeItem: (slug: string) => void
  updateQuantity: (slug: string, quantity: number) => void
  clearCart: () => void
  itemCount: number
  subtotalHT: number
  totalTVA: number
  totalTTC: number
}

const CartContext = createContext<CartContextValue | undefined>(undefined)

const STORAGE_KEY = 'inocasa-cart'

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([])
  const [hydrated, setHydrated] = useState(false)

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY)
      if (raw) {
        const parsed = JSON.parse(raw)
        if (Array.isArray(parsed)) {
          // Backfill category for carts saved before it was stored.
          setItems(
            parsed.map((item: CartItem) => ({
              ...item,
              category: item.category ?? 'accessoire',
            })),
          )
        }
      }
    } catch {
      // localStorage unavailable or corrupted — start with an empty cart
    } finally {
      setHydrated(true)
    }
  }, [])

  useEffect(() => {
    if (!hydrated) return
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items))
    } catch {
      // localStorage unavailable — cart won't persist this session
    }
  }, [items, hydrated])

  const addItem = useCallback((product: Product, quantity = 1) => {
    setItems((current) => {
      const existing = current.find((item) => item.slug === product.slug)
      if (existing) {
        return current.map((item) =>
          item.slug === product.slug ? { ...item, quantity: item.quantity + quantity } : item,
        )
      }
      return [
        ...current,
        {
          sku: product.sku,
          slug: product.slug,
          name: product.name,
          priceTTC: product.priceTTC,
          priceHT: product.priceHT,
          image: product.image,
          category: product.category,
          quantity,
        },
      ]
    })
  }, [])

  const removeItem = useCallback((slug: string) => {
    setItems((current) => current.filter((item) => item.slug !== slug))
  }, [])

  const updateQuantity = useCallback((slug: string, quantity: number) => {
    setItems((current) =>
      current.map((item) =>
        item.slug === slug ? { ...item, quantity: Math.max(1, quantity) } : item,
      ),
    )
  }, [])

  const clearCart = useCallback(() => {
    setItems([])
  }, [])

  const { itemCount, subtotalHT, totalTVA, totalTTC } = useMemo(() => {
    const itemCount = items.reduce((sum, item) => sum + item.quantity, 0)
    const totalTTC = items.reduce((sum, item) => sum + item.priceTTC * item.quantity, 0)
    const subtotalHT = items.reduce((sum, item) => sum + item.priceHT * item.quantity, 0)
    const totalTVA = totalTTC - subtotalHT
    return { itemCount, subtotalHT, totalTVA, totalTTC }
  }, [items])

  const value = useMemo(
    () => ({
      items,
      addItem,
      removeItem,
      updateQuantity,
      clearCart,
      itemCount,
      subtotalHT,
      totalTVA,
      totalTTC,
    }),
    [
      items,
      addItem,
      removeItem,
      updateQuantity,
      clearCart,
      itemCount,
      subtotalHT,
      totalTVA,
      totalTTC,
    ],
  )

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>
}

export function useCart() {
  const context = useContext(CartContext)
  if (!context) {
    throw new Error('useCart must be used within a CartProvider')
  }
  return context
}
