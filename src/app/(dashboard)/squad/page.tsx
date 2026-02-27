'use client'

import { useState } from 'react'
import useSWR from 'swr'
import Link from 'next/link'
import {
  Bot, Play, Square, AlertCircle, CheckCircle2, Clock,
  Loader2, Plus, ChevronRight, Cpu, Layers, Settings,
  Activity,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { cn, formatDate } from '@/lib/utils'

type StatusAgente = 'DISPONIVEL' | 'EM_EXECUCAO' | 'INATIVO' | 'ERRO'
type StatusExecucao = 'PENDENTE' | 'EM_ANDAMENTO' | 'CONCLUIDA' | 'FALHA'

interface Execucao {
  id: string
  status: StatusExecucao
  comando: string
  iniciadoEm: string
  concluidoEm: string | null
  duracaoMs: number | null
}

interface Agente {
  id: string
  nome: string
  role: string
  icone: string
  descricao: string | null
  status: StatusAgente
  squad: { id: string; nome: string }
  execucoes: Execucao[]
}

interface Squad {
  id: string
  nome: string
  descricao: string | null
  avatar: string
  cor: string
  ativo: boolean
  agentes: Agente[]
}

const fetcher = (url: string) => fetch(url).then((r) => r.json())

const agenteStatusConfig: Record<StatusAgente, { label: string; color: string; dot: string; icon: React.ElementType }> = {
  DISPONIVEL: { label: 'Disponível', color: 'text-emerald-400', dot: 'bg-emerald-400', icon: CheckCircle2 },
  EM_EXECUCAO: { label: 'Em Execução', color: 'text-blue-400', dot: 'bg-blue-400', icon: Loader2 },
  INATIVO: { label: 'Inativo', color: 'text-muted-foreground', dot: 'bg-surface-3', icon: Square },
  ERRO: { label: 'Erro', color: 'text-red-400', dot: 'bg-red-400', icon: AlertCircle },
}

const execStatusConfig: Record<StatusExecucao, { label: string; color: string }> = {
  PENDENTE: { label: 'Pendente', color: 'bg-yellow-500/20 text-yellow-400' },
  EM_ANDAMENTO: { label: 'Em Andamento', color: 'bg-blue-500/20 text-blue-400' },
  CONCLUIDA: { label: 'Concluída', color: 'bg-emerald-500/20 text-emerald-400' },
  FALHA: { label: 'Falha', color: 'bg-red-500/20 text-red-400' },
}

export default function SquadPage() {
  const [selectedAgente, setSelectedAgente] = useState<Agente | null>(null)
  const [comando, setComando] = useState('')
  const [disparando, setDisparando] = useState(false)
  const [execucaoRecente, setExecucaoRecente] = useState<{ execucaoId: string } | null>(null)

  const { data: agentes, isLoading: loadingAgentes, mutate: mutateAgentes } = useSWR<Agente[]>(
    '/api/agentes', fetcher, { refreshInterval: 5000 }
  )
  const { data: squads, isLoading: loadingSquads } = useSWR<Squad[]>('/api/squads', fetcher)
  const { data: execucoes, isLoading: loadingExec, mutate: mutateExec } = useSWR<Execucao[]>(
    '/api/execucoes', fetcher, { refreshInterval: 3000 }
  )

  const handleDisparar = async () => {
    if (!selectedAgente || !comando.trim()) return
    setDisparando(true)
    try {
      const res = await fetch('/api/execucoes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          agenteId: selectedAgente.id,
          comando: comando.trim(),
        }),
      })
      if (res.ok) {
        const data = await res.json()
        setExecucaoRecente(data)
        setComando('')
        mutateAgentes()
        mutateExec()
      }
    } finally {
      setDisparando(false)
    }
  }

  const handleCancelarExecucao = async (id: string) => {
    await fetch(`/api/execucoes/${id}`, { method: 'DELETE' })
    mutateAgentes()
    mutateExec()
  }

  const totalAgentes = agentes?.length ?? 0
  const agentesAtivos = agentes?.filter((a) => a.status === 'DISPONIVEL').length ?? 0
  const agentesEmExec = agentes?.filter((a) => a.status === 'EM_EXECUCAO').length ?? 0

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-surface-3">
        <div>
          <h1 className="text-lg font-semibold text-foreground">Squad IA</h1>
          <p className="text-xs text-muted-foreground">
            {totalAgentes} agentes · {agentesAtivos} disponíveis · {agentesEmExec} em execução
          </p>
        </div>
        <Link href="/squad/integracoes">
          <Button variant="ghost" size="sm" className="text-xs text-muted-foreground h-8 gap-1.5">
            <Settings className="w-3.5 h-3.5" /> Integrações
          </Button>
        </Link>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* ── Painel esquerdo: Agentes ── */}
        <div className="w-72 flex-shrink-0 border-r border-surface-3 flex flex-col">
          <div className="px-4 py-3 border-b border-surface-3">
            <p className="text-xs font-medium text-muted-foreground">Agentes</p>
          </div>
          <div className="flex-1 overflow-y-auto py-2 px-2 space-y-1">
            {loadingAgentes && (
              <>
                <Skeleton className="h-16 bg-surface-2 rounded-lg" />
                <Skeleton className="h-16 bg-surface-2 rounded-lg" />
              </>
            )}
            {(agentes ?? []).map((agente) => {
              const cfg = agenteStatusConfig[agente.status]
              const Icon = cfg.icon
              return (
                <button
                  key={agente.id}
                  onClick={() => setSelectedAgente(agente)}
                  className={cn(
                    'w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left transition-colors',
                    selectedAgente?.id === agente.id
                      ? 'bg-gold-400/10 border border-gold-400/20'
                      : 'hover:bg-surface-2'
                  )}
                >
                  <div className="relative flex-shrink-0">
                    <div className="w-9 h-9 rounded-lg bg-surface-2 flex items-center justify-center text-lg">
                      {agente.icone}
                    </div>
                    <span className={cn('absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-surface-1', cfg.dot)} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{agente.nome}</p>
                    <p className="text-[10px] text-muted-foreground truncate">{agente.role}</p>
                  </div>
                  <Icon className={cn('w-3.5 h-3.5 flex-shrink-0', cfg.color, agente.status === 'EM_EXECUCAO' && 'animate-spin')} />
                </button>
              )
            })}
          </div>
        </div>

        {/* ── Painel direito ── */}
        <div className="flex-1 overflow-y-auto flex flex-col">
          {/* Painel de disparo */}
          {selectedAgente ? (
            <div className="px-6 py-4 border-b border-surface-3 space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-surface-2 flex items-center justify-center text-xl">
                  {selectedAgente.icone}
                </div>
                <div>
                  <p className="text-sm font-semibold text-foreground">{selectedAgente.nome}</p>
                  <p className="text-xs text-muted-foreground">{selectedAgente.role}</p>
                </div>
                <span className={cn(
                  'ml-auto px-2 py-0.5 rounded-full text-[10px] font-medium',
                  agenteStatusConfig[selectedAgente.status].color
                )}>
                  {agenteStatusConfig[selectedAgente.status].label}
                </span>
              </div>

              {selectedAgente.descricao && (
                <p className="text-xs text-muted-foreground bg-surface-2 rounded-md p-2">
                  {selectedAgente.descricao}
                </p>
              )}

              {selectedAgente.status === 'DISPONIVEL' ? (
                <div className="flex items-center gap-2">
                  <input
                    className="flex-1 h-8 px-3 rounded-md bg-surface-2 border border-surface-3 text-sm text-foreground placeholder-muted-foreground focus:outline-none focus:border-gold-400/50"
                    placeholder="Comando para o agente..."
                    value={comando}
                    onChange={(e) => setComando(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleDisparar()}
                  />
                  <Button
                    onClick={handleDisparar}
                    disabled={!comando.trim() || disparando}
                    className="bg-gold-400 text-surface-base hover:bg-gold-500 h-8 text-xs"
                  >
                    {disparando ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5" />}
                    Disparar
                  </Button>
                </div>
              ) : (
                <p className="text-xs text-muted-foreground">
                  Agente {agenteStatusConfig[selectedAgente.status].label.toLowerCase()} — indisponível para novos comandos
                </p>
              )}

              {execucaoRecente && (
                <div className="flex items-center gap-2 text-xs text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 rounded-md px-3 py-2">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Execução criada: {execucaoRecente.execucaoId.slice(0, 8)}...
                </div>
              )}
            </div>
          ) : (
            <div className="px-6 py-4 border-b border-surface-3">
              <p className="text-xs text-muted-foreground">Selecione um agente para disparar um comando</p>
            </div>
          )}

          {/* Execuções recentes */}
          <div className="flex-1 px-6 py-4 space-y-3">
            <div className="flex items-center gap-2">
              <Activity className="w-4 h-4 text-muted-foreground" />
              <p className="text-sm font-medium text-foreground">Execuções Recentes</p>
            </div>

            {loadingExec && (
              <div className="space-y-2">
                {[1, 2, 3].map((i) => <Skeleton key={i} className="h-14 bg-surface-2" />)}
              </div>
            )}

            {!loadingExec && (execucoes ?? []).length === 0 && (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <Cpu className="w-8 h-8 text-muted-foreground/30 mb-2" />
                <p className="text-sm text-muted-foreground">Nenhuma execução ainda</p>
              </div>
            )}

            <div className="space-y-1.5">
              {(execucoes ?? []).map((exec) => {
                const cfg = execStatusConfig[exec.status]
                return (
                  <div key={exec.id} className="flex items-center gap-4 px-4 py-3 bg-surface-1 border border-surface-3 rounded-lg">
                    <span className={cn('px-2 py-0.5 rounded-full text-[10px] font-medium flex-shrink-0', cfg.color)}>
                      {cfg.label}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-foreground truncate">{exec.comando}</p>
                      <p className="text-[10px] text-muted-foreground">{formatDate(exec.iniciadoEm)}</p>
                    </div>
                    {exec.duracaoMs && (
                      <span className="text-xs text-muted-foreground flex-shrink-0">
                        {(exec.duracaoMs / 1000).toFixed(1)}s
                      </span>
                    )}
                    {(exec.status === 'PENDENTE' || exec.status === 'EM_ANDAMENTO') && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="w-7 h-7 text-muted-foreground hover:text-red-400"
                        onClick={() => handleCancelarExecucao(exec.id)}
                      >
                        <Square className="w-3.5 h-3.5" />
                      </Button>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
