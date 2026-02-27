'use client'

import { useState, useEffect } from 'react'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetClose } from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { X, MessageSquare, Clock, User, CheckCircle2, Circle, Loader2 } from 'lucide-react'
import { cn, formatDate } from '@/lib/utils'

type StatusTarefa = 'PENDENTE' | 'EM_ANDAMENTO' | 'BLOQUEADA' | 'CONCLUIDA'
type NivelLog = 'INFO' | 'WARN' | 'ERROR' | 'SUCCESS'

interface Detalhamento {
  id: string
  conteudo: string
  createdAt: string
  autor: { nome: string }
}

interface Tarefa {
  id: string
  titulo: string
  descricao?: string | null
  status: StatusTarefa
  prazo?: string | null
  responsavel?: { id: string; nome: string } | null
  detalhamentos: Detalhamento[]
}

interface TarefaSlideOverProps {
  tarefaId: string | null
  projetoId: string
  onClose: () => void
  onUpdate: () => void
}

const statusConfig: Record<StatusTarefa, { label: string; color: string; icon: React.ElementType }> = {
  PENDENTE: { label: 'Pendente', color: 'bg-surface-3 text-muted-foreground', icon: Circle },
  EM_ANDAMENTO: { label: 'Em Andamento', color: 'bg-blue-500/20 text-blue-400', icon: Loader2 },
  BLOQUEADA: { label: 'Bloqueada', color: 'bg-red-500/20 text-red-400', icon: X },
  CONCLUIDA: { label: 'Concluída', color: 'bg-emerald-500/20 text-emerald-400', icon: CheckCircle2 },
}

export function TarefaSlideOver({ tarefaId, projetoId, onClose, onUpdate }: TarefaSlideOverProps) {
  const [tarefa, setTarefa] = useState<Tarefa | null>(null)
  const [loading, setLoading] = useState(false)
  const [novoDetalhamento, setNovoDetalhamento] = useState('')
  const [salvandoDetalhamento, setSalvandoDetalhamento] = useState(false)
  const [salvandoStatus, setSalvandoStatus] = useState(false)

  useEffect(() => {
    if (!tarefaId) { setTarefa(null); return }
    setLoading(true)
    fetch(`/api/tarefas/${tarefaId}`)
      .then((r) => r.json())
      .then((d) => setTarefa(d))
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [tarefaId])

  const handleStatusChange = async (novoStatus: string) => {
    if (!tarefa) return
    setSalvandoStatus(true)
    try {
      const res = await fetch(`/api/tarefas/${tarefa.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: novoStatus }),
      })
      if (res.ok) {
        setTarefa((prev) => prev ? { ...prev, status: novoStatus as StatusTarefa } : null)
        onUpdate()
      }
    } finally {
      setSalvandoStatus(false)
    }
  }

  const handleAddDetalhamento = async () => {
    if (!tarefa || !novoDetalhamento.trim()) return
    setSalvandoDetalhamento(true)
    try {
      const res = await fetch(`/api/tarefas/${tarefa.id}/detalhamentos`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ conteudo: novoDetalhamento.trim() }),
      })
      if (res.ok) {
        const criado = await res.json()
        setTarefa((prev) => prev
          ? { ...prev, detalhamentos: [...prev.detalhamentos, criado] }
          : null
        )
        setNovoDetalhamento('')
      }
    } finally {
      setSalvandoDetalhamento(false)
    }
  }

  const config = tarefa ? statusConfig[tarefa.status] : null
  const StatusIcon = config?.icon ?? Circle

  return (
    <Sheet open={!!tarefaId} onOpenChange={(open) => { if (!open) onClose() }}>
      <SheetContent className="w-full sm:max-w-lg bg-surface-1 border-l border-surface-3 flex flex-col">
        <SheetHeader className="flex-shrink-0">
          <div className="flex items-center justify-between">
            <SheetTitle className="text-base text-foreground">
              {loading ? 'Carregando...' : (tarefa?.titulo ?? 'Tarefa')}
            </SheetTitle>
            <SheetClose asChild>
              <Button variant="ghost" size="icon" className="h-7 w-7">
                <X className="w-4 h-4" />
              </Button>
            </SheetClose>
          </div>
        </SheetHeader>

        {loading && (
          <div className="flex-1 flex items-center justify-center">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        )}

        {!loading && tarefa && (
          <div className="flex-1 overflow-y-auto space-y-6 pt-4">
            {/* Status */}
            <div className="space-y-1.5">
              <p className="text-xs text-muted-foreground font-medium">Status</p>
              <Select value={tarefa.status} onValueChange={handleStatusChange} disabled={salvandoStatus}>
                <SelectTrigger className="w-full bg-surface-2 border-surface-3">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-surface-2 border-surface-3">
                  {(Object.keys(statusConfig) as StatusTarefa[]).map((s) => (
                    <SelectItem key={s} value={s}>
                      <span className={cn('px-2 py-0.5 rounded-full text-xs font-medium', statusConfig[s].color)}>
                        {statusConfig[s].label}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Descrição */}
            {tarefa.descricao && (
              <div className="space-y-1.5">
                <p className="text-xs text-muted-foreground font-medium">Descrição</p>
                <p className="text-sm text-foreground bg-surface-2 rounded-md p-3">{tarefa.descricao}</p>
              </div>
            )}

            {/* Meta */}
            <div className="flex gap-4 text-xs text-muted-foreground">
              {tarefa.prazo && (
                <div className="flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5" />
                  <span>Prazo: {formatDate(tarefa.prazo)}</span>
                </div>
              )}
              {tarefa.responsavel && (
                <div className="flex items-center gap-1">
                  <User className="w-3.5 h-3.5" />
                  <span>{tarefa.responsavel.nome}</span>
                </div>
              )}
            </div>

            {/* Detalhamentos */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-muted-foreground" />
                <p className="text-xs font-medium text-muted-foreground">
                  Detalhamentos ({tarefa.detalhamentos.length})
                </p>
              </div>

              <div className="space-y-3">
                {tarefa.detalhamentos.map((d) => (
                  <div key={d.id} className="bg-surface-2 rounded-md p-3 space-y-1">
                    <p className="text-sm text-foreground whitespace-pre-wrap">{d.conteudo}</p>
                    <p className="text-[11px] text-muted-foreground">
                      {d.autor.nome} · {formatDate(d.createdAt)}
                    </p>
                  </div>
                ))}
              </div>

              {/* Novo detalhamento */}
              <div className="space-y-2">
                <Textarea
                  value={novoDetalhamento}
                  onChange={(e) => setNovoDetalhamento(e.target.value)}
                  placeholder="Adicionar detalhamento ou anotação..."
                  className="bg-surface-2 border-surface-3 text-sm resize-none min-h-[80px]"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && e.ctrlKey) {
                      e.preventDefault()
                      handleAddDetalhamento()
                    }
                  }}
                />
                <Button
                  size="sm"
                  onClick={handleAddDetalhamento}
                  disabled={!novoDetalhamento.trim() || salvandoDetalhamento}
                  className="bg-gold-400 text-surface-base hover:bg-gold-500 text-xs"
                >
                  {salvandoDetalhamento ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : null}
                  Salvar
                </Button>
              </div>
            </div>
          </div>
        )}
      </SheetContent>
    </Sheet>
  )
}
