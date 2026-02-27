import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import { Providers } from '@/components/providers'
import './globals.css'

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
})

export const metadata: Metadata = {
  title: {
    default: 'Gestão de Agências',
    template: '%s | Gestão de Agências',
  },
  description: 'Sistema completo de gestão para agências digitais',
  robots: 'noindex, nofollow', // Aplicação privada
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="pt-BR" className="dark">
      <body className={`${inter.variable} font-sans bg-surface-base text-foreground antialiased`}>
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
