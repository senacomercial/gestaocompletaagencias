'use client'

import { useState, useEffect, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import { toast } from 'sonner'
import { Phone, MessageSquare, UserPlus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'

interface ContatoNaoId {
  telefoneContato: string
  _count: { id: number }
  ultimaMensagem: string
  timestamp: Date
}

export default function NaoIdentificadasPage() {
  const { data: session } = useSession()
  const [contatos, setContatos] = useState<ContatoNaoId[]>([])
  const [isLoading, setIsLoading] = useState(true)

  const fetchContatos = useCallback(async () => {
    setIsLoading(true)
    try {
      const res = await fetch('/api/mensagens/nao-identificadas')
      if (res.ok) {
        const data = await res.json()
        setContatos(data)
      }
    } catch {
      toast.error('Erro ao carregar contatos')
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    if (session?.user) fetchContatos()
  }, [session, fetchContatos])

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Contatos Não Identificados</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Mensagens de contatos que ainda não estão vinculados a um lead
        </p>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-20 w-full rounded-xl" />
          ))}
        </div>
      ) : contatos.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-muted-foreground gap-2">
          <MessageSquare className="h-10 w-10 opacity-30" />
          <p>Nenhum contato não identificado</p>
        </div>
      ) : (
        <div className="space-y-3">
          {contatos.map((c) => (
            <div
              key={c.telefoneContato}
              className="rounded-xl border border-surface-3 bg-surface-1 p-4 flex items-center justify-between"
            >
              <div className="flex items-center gap-3">
                <div className="rounded-full bg-surface-2 p-2">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                </div>
                <div>
                  <p className="font-medium text-sm">+{c.telefoneContato}</p>
                  <p className="text-xs text-muted-foreground line-clamp-1">
                    {c.ultimaMensagem}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {c._count.id} mensagem{c._count.id !== 1 ? 's' : ''}
                  </p>
                </div>
              </div>

              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  // Navegar para criar lead com telefone preenchido
                  window.location.href = `/crm?novoLead=1&telefone=${c.telefoneContato}`
                }}
              >
                <UserPlus className="h-4 w-4 mr-1" />
                Criar Lead
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
