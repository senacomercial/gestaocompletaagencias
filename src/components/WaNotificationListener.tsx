'use client'

import { useEffect } from 'react'
import { useSocket } from '@/hooks/useSocket'
import { useUnreadMessages } from '@/hooks/useUnreadMessages'
import { toast } from 'sonner'
import type { MensagemSocket } from '@/types'
import { MessageSquare } from 'lucide-react'

/**
 * Componente invisível que escuta eventos wa:message globalmente.
 * Incrementa contadores de não-lidas e exibe toast de notificação.
 */
export function WaNotificationListener() {
  const { on } = useSocket()
  const increment = useUnreadMessages((s) => s.increment)

  useEffect(() => {
    const off = on('wa:message', ((data: MensagemSocket) => {
      if (data.fromMe) return

      // Incrementar badge do lead (se vinculado)
      if (data.leadId) {
        increment(data.leadId)
      }

      // Toast de notificação global
      toast.info(`Nova mensagem de +${data.telefoneContato}`, {
        description: data.corpo.slice(0, 80),
        icon: <MessageSquare className="h-4 w-4" />,
        duration: 5000,
      })
    }) as (...args: unknown[]) => void)

    return () => off?.()
  }, [on, increment])

  return null
}
