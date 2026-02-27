'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useSocket } from '@/hooks/useSocket'
import { useSession } from 'next-auth/react'
import { Send, Loader2, MessageSquare } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { toast } from 'sonner'
import type { MensagemSocket } from '@/types'

interface Mensagem {
  id: string
  corpo: string
  fromMe: boolean
  timestamp: Date | string
  telefoneContato: string
}

interface WhatsAppChatProps {
  leadId: string
  telefone: string | null | undefined
}

export function WhatsAppChat({ leadId, telefone }: WhatsAppChatProps) {
  const { data: session } = useSession()
  const { emit, on } = useSocket()
  const [mensagens, setMensagens] = useState<Mensagem[]>([])
  const [texto, setTexto] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [isSending, setIsSending] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)
  const organizacaoId = session?.user?.organizacaoId

  const fetchMensagens = useCallback(async () => {
    setIsLoading(true)
    try {
      const res = await fetch(`/api/mensagens?leadId=${leadId}`)
      if (res.ok) {
        const data = await res.json()
        setMensagens(data)
      }
    } catch {
      // silently fail
    } finally {
      setIsLoading(false)
    }
  }, [leadId])

  useEffect(() => {
    fetchMensagens()
  }, [fetchMensagens])

  // Scroll para baixo sempre que novas mensagens chegarem
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [mensagens])

  // Escutar mensagens em tempo real
  useEffect(() => {
    if (!telefone || !organizacaoId) return

    const telLimpo = telefone.replace(/\D/g, '')

    const off = on('wa:message', ((data: MensagemSocket) => {
      if (data.organizacaoId !== organizacaoId) return
      if (!data.telefoneContato.includes(telLimpo.slice(-8))) return

      setMensagens((prev) => {
        // Evitar duplicatas
        if (prev.find((m) => m.id === data.id)) return prev
        return [
          ...prev,
          {
            id: data.id || Date.now().toString(),
            corpo: data.corpo,
            fromMe: data.fromMe,
            timestamp: data.timestamp,
            telefoneContato: data.telefoneContato,
          },
        ]
      })
    }) as (...args: unknown[]) => void)

    return () => off?.()
  }, [telefone, organizacaoId, on])

  const handleSend = async () => {
    if (!texto.trim() || !telefone || !organizacaoId || isSending) return

    const telLimpo = telefone.replace(/\D/g, '')
    setIsSending(true)

    // Optimistic update
    const msgTemp: Mensagem = {
      id: `temp-${Date.now()}`,
      corpo: texto,
      fromMe: true,
      timestamp: new Date(),
      telefoneContato: telLimpo,
    }
    setMensagens((prev) => [...prev, msgTemp])
    setTexto('')

    try {
      emit('wa:send', { organizacaoId, telefone: telLimpo, corpo: texto })

      // Persistir mensagem enviada
      await fetch('/api/mensagens', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-internal-token': '', // será rejeitado — usamos evento de socket para persistir
        },
        body: JSON.stringify({
          organizacaoId,
          telefoneContato: telLimpo,
          corpo: texto,
          fromMe: true,
          whatsappId: msgTemp.id,
          leadId,
        }),
      }).catch(() => {}) // Ignorar erro — socket server persiste
    } catch {
      toast.error('Erro ao enviar mensagem')
      setMensagens((prev) => prev.filter((m) => m.id !== msgTemp.id))
    } finally {
      setIsSending(false)
    }
  }

  if (!telefone) {
    return (
      <div className="flex flex-col items-center justify-center h-48 text-center text-muted-foreground gap-2">
        <MessageSquare className="h-8 w-8 opacity-30" />
        <p className="text-sm">Este lead não tem telefone cadastrado</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full min-h-0">
      {/* Lista de mensagens */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2 min-h-0">
        {isLoading ? (
          <div className="space-y-2">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className={`h-10 w-3/4 rounded-2xl ${i % 2 === 0 ? 'ml-auto' : ''}`} />
            ))}
          </div>
        ) : mensagens.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-32 text-muted-foreground gap-2">
            <MessageSquare className="h-6 w-6 opacity-30" />
            <p className="text-xs">Nenhuma mensagem ainda</p>
          </div>
        ) : (
          mensagens.map((msg) => (
            <div
              key={msg.id}
              className={`flex ${msg.fromMe ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[80%] rounded-2xl px-3 py-2 text-sm ${
                  msg.fromMe
                    ? 'bg-gold-500 text-black rounded-tr-sm'
                    : 'bg-surface-2 text-foreground rounded-tl-sm'
                }`}
              >
                <p className="leading-relaxed">{msg.corpo}</p>
                <p className={`text-xs mt-0.5 ${msg.fromMe ? 'text-black/60' : 'text-muted-foreground'}`}>
                  {new Date(msg.timestamp).toLocaleTimeString('pt-BR', {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </p>
              </div>
            </div>
          ))
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input de envio */}
      <div className="border-t border-surface-3 p-3 flex gap-2 items-end">
        <textarea
          className="flex-1 resize-none bg-surface-2 border border-surface-3 rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-gold-500/50 min-h-[40px] max-h-24"
          placeholder="Digite uma mensagem..."
          value={texto}
          rows={1}
          onChange={(e) => setTexto(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault()
              handleSend()
            }
          }}
        />
        <Button
          size="sm"
          onClick={handleSend}
          disabled={!texto.trim() || isSending}
          className="h-10 w-10 p-0"
        >
          {isSending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Send className="h-4 w-4" />
          )}
        </Button>
      </div>
    </div>
  )
}
