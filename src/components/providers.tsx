'use client'

import { SessionProvider } from 'next-auth/react'
import { Toaster } from 'sonner'
import type { Session } from 'next-auth'
import { WaNotificationListener } from './WaNotificationListener'

interface ProvidersProps {
  children: React.ReactNode
  session?: Session | null
}

export function Providers({ children, session }: ProvidersProps) {
  return (
    <SessionProvider session={session}>
      {children}
      <WaNotificationListener />
      <Toaster position="bottom-right" richColors theme="dark" />
    </SessionProvider>
  )
}
