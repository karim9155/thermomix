'use client'

import { Toast as ToastPrimitive } from '@base-ui/react/toast'
import { X } from 'lucide-react'

export const ToastProvider = ToastPrimitive.Provider
export const useToast = ToastPrimitive.useToastManager

function ToastList() {
  const { toasts } = useToast()

  return (
    <ToastPrimitive.Portal>
      <ToastPrimitive.Viewport className="toast-viewport">
        {toasts.map((toast) => (
          <ToastPrimitive.Root key={toast.id} toast={toast} className="toast-root">
            <ToastPrimitive.Title className="toast-title" />
            {toast.description ? (
              <ToastPrimitive.Description className="toast-description" />
            ) : null}
            <ToastPrimitive.Close className="toast-close" aria-label="Fermer la notification">
              <X size={14} />
            </ToastPrimitive.Close>
          </ToastPrimitive.Root>
        ))}
      </ToastPrimitive.Viewport>
    </ToastPrimitive.Portal>
  )
}

export function Toaster() {
  return <ToastList />
}
