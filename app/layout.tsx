import { Analytics } from '@vercel/analytics/next'
import type { Metadata, Viewport } from 'next'
import './globals.css'
import { CartProvider } from '@/lib/cart-context'
import { ToastProvider, Toaster } from '@/components/ui/toast'

export const metadata: Metadata = {
  title: 'Boutique Thermomix® | INOCASA Tunisie',
  description:
    'Découvrez le Thermomix® TM7, ses accessoires et ses pièces d’origine chez INOCASA, distributeur officiel Vorwerk en Tunisie.',
  generator: 'v0.app',
}

export const viewport: Viewport = {
  colorScheme: 'light',
  themeColor: '#ffffff',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="fr" className="bg-white">
      <body className="antialiased">
        <CartProvider>
          <ToastProvider>
            {children}
            <Toaster />
          </ToastProvider>
        </CartProvider>
        {process.env.NODE_ENV === 'production' && <Analytics />}
      </body>
    </html>
  )
}
