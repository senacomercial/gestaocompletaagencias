'use client'

import { useState } from 'react'
import useSWR from 'swr'
import Link from 'next/link'
import {
  FolderKanban, Plus, Search, Building2, Calendar, CheckCircle2,
  Clock, Loader2, ChevronRight,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { cn, formatDate } from '@/lib/utils'

type StatusProjeto = 'ATIVO' | 'CONCLUIDO' | 'PAUSADO' | 'CANCELADO'

interface ProjetoListItem {
  id: string
  nome: string
  tipoServico: string
  status: StatusProjeto
  createdAt: string
  lead: { nome: string; empresa: string | null }
  _count: { tarefas: number }
  tarefasConcluidas?: number
}

const fetcher = (url: string) => fetch(url).then((r) => r.json())

const statusConfig: Record<StatusProjeto, { label: string; color: string }> = {
  ATIVO: { label: 'Em Andamento', color: 'bg-blue-500/20 text-blue-400' },
  CONCLUIDO: { label: 'Concluído', color: 'bg-emerald-500/20 text-emerald-400' },
  PAUSADO: { label: 'Pausado', color: 'bg-yellow-500/20 text-yellow-400' },
  CANCELADO: { label: 'Cancelado', color: 'bg-red-500/20 text-red-400' },
}

export default function ProjetosPage() {
  const [busca, setBusca] = useState('')
  const [filtroStatus, setFiltroStatus] = useState<string>('todos')

  const { data: projetos, isLoading } = useSWR<ProjetoListItem[]>('/api/projetos', fetcher)

  const projetosFiltrados = (projetos ?? []).filter((p) => {
    const matchBusca = !busca ||
      p.nome.toLowerCase().includes(busca.toLowerCase()) ||
      p.lead.nome.toLowerCase().includes(busca.toLowerCase()) ||
      (p.lead.empresa ?? '').toLowerCase().includes(busca.toLowerCase())
    const matchStatus = filtroStatus === 'todos' || p.status === filtroStatus
    return matchBusca && matchStatus
  })

  const totalAtivos = (projetos ?? []).filter((p) => p.status === 'ATIVO').length

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-surface-3">
        <div>
          <h1 className="text-lg font-semibold text-foreground">Projetos</h1>
          <p className="text-xs text-muted-foreground">
            {isLoading ? '...' : `${projetos?.length ?? 0} projetos · ${totalAtivos} em andamento`}
          </p>
        </div>
        <Button
          asChild
          className="bg-gold-400 text-surface-base hover:bg-gold-500 text-sm h-8"
        >
          <Link href="/crm">
            <Plus className="w-4 h-4 mr-1" /> Novo Projeto
          </Link>
        </Button>
      </div>

      {/* Filtros */}
      <div className="flex items-center gap-3 px-6 py-3 border-b border-surface-3">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
          <input
            className="w-full pl-8 pr-3 h-8 rounded-md bg-surface-2 border border-surface-3 text-sm text-foreground placeholder-muted-foreground focus:outline-none focus:border-gold-400/50"
            placeholder="Buscar projetos..."
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
          />
        </div>

        <div className="flex items-center gap-1">
          {['todos', 'ATIVO', 'CONCLUIDO', 'PAUSADO', 'CANCELADO'].map((s) => (
            <button
              key={s}
              onClick={() => setFiltroStatus(s)}
              className={cn(
                'px-3 h-7 rounded-md text-xs font-medium transition-colors',
                filtroStatus === s
                  ? 'bg-gold-400/20 text-gold-400'
                  : 'text-muted-foreground hover:bg-surface-2'
              )}
            >
              {s === 'todos' ? 'Todos' : statusConfig[s as StatusProjeto]?.label ?? s}
            </button>
          ))}
        </div>
      </div>

      {/* Lista */}
      <div className="flex-1 overflow-y-auto px-6 py-4">
        {isLoading && (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-24 w-full rounded-lg bg-surface-2" />
            ))}
          </div>
        )}

        {!isLoading && projetosFiltrados.length === 0 && (
          <div className="flex flex-col items-center justify-center h-64 text-center">
            <FolderKanban className="w-10 h-10 text-muted-foreground/30 mb-3" />
            <p className="text-sm text-muted-foreground">
              {busca || filtroStatus !== 'todos'
                ? 'Nenhum projeto encontrado com esses filtros'
                : 'Projetos são criados automaticamente ao converter um lead'}
            </p>
          </div>
        )}

        <div className="space-y-2">
          {projetosFiltrados.map((projeto) => {
            const config = statusConfig[projeto.status]
            const progresso = projeto._count.tarefas > 0
              ? Math.round(((projeto.tarefasConcluidas ?? 0) / projeto._count.tarefas) * 100)
              : 0

            return (
              <Link
                key={projeto.id}
                href={`/projetos/${projeto.id}`}
                className="flex items-center gap-4 p-4 bg-surface-1 border border-surface-3 rounded-lg hover:border-gold-400/30 hover:bg-surface-2/50 transition-all group"
              >
                {/* Ícone */}
                <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-gold-400/10 flex items-center justify-center">
                  <FolderKanban className="w-5 h-5 text-gold-400" />
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <p className="text-sm font-medium text-foreground truncate">{projeto.nome}</p>
                    <span className={cn('px-2 py-0.5 rounded-full text-[10px] font-medium flex-shrink-0', config.color)}>
                      {config.label}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Building2 className="w-3 h-3" />
                      {projeto.lead.empresa ?? projeto.lead.nome}
                    </span>
                    <span className="text-surface-3">·</span>
                    <span>{projeto.tipoServico}</span>
                    <span className="text-surface-3">·</span>
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      {formatDate(projeto.createdAt)}
                    </span>
                  </div>

                  {/* Barra de progresso */}
                  {projeto._count.tarefas > 0 && (
                    <div className="flex items-center gap-2 mt-2">
                      <div className="flex-1 h-1.5 bg-surface-3 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gold-400 rounded-full transition-all"
                          style={{ width: `${progresso}%` }}
                        />
                      </div>
                      <span className="text-[10px] text-muted-foreground flex-shrink-0">
                        {projeto.tarefasConcluidas ?? 0}/{projeto._count.tarefas} tarefas
                      </span>
                    </div>
                  )}
                </div>

                <ChevronRight className="w-4 h-4 text-muted-foreground flex-shrink-0 group-hover:text-foreground transition-colors" />
              </Link>
            )
          })}
        </div>
      </div>
    </div>
  )
}
