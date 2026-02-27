'use client'

import { useState } from 'react'
import useSWR from 'swr'
import Link from 'next/link'
import {
  ArrowLeft, Plus, Circle, Loader2, CheckCircle2, AlertCircle,
  User, Calendar, Building2, MoreVertical, Layers,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { TarefaSlideOver } from '@/components/projetos/TarefaSlideOver'
import { cn, formatDate } from '@/lib/utils'

type StatusProjeto = 'EM_ANDAMENTO' | 'CONCLUIDO' | 'PAUSADO' | 'CANCELADO'
type StatusTarefa = 'PENDENTE' | 'EM_ANDAMENTO' | 'BLOQUEADA' | 'CONCLUIDA'

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
  ordem: number
  sprintId?: string | null
  responsavel?: { id: string; nome: string } | null
  detalhamentos: Detalhamento[]
}

interface Sprint {
  id: string
  nome: string
  dataInicio: string
  dataFim: string
}

interface Projeto {
  id: string
  nome: string
  tipoServico: string
  status: StatusProjeto
  createdAt: string
  lead: { id: string; nome: string; empresa: string | null }
  tarefas: Tarefa[]
  sprints: Sprint[]
}

const fetcher = (url: string) => fetch(url).then((r) => r.json())

const tarefaStatusConfig: Record<StatusTarefa, { label: string; color: string; icon: React.ElementType }> = {
  PENDENTE: { label: 'Pendente', color: 'text-muted-foreground', icon: Circle },
  EM_ANDAMENTO: { label: 'Em Andamento', color: 'text-blue-400', icon: Loader2 },
  BLOQUEADA: { label: 'Bloqueada', color: 'text-red-400', icon: AlertCircle },
  CONCLUIDA: { label: 'Concluída', color: 'text-emerald-400', icon: CheckCircle2 },
}

interface NewTarefaForm {
  titulo: string
  sprintId: string
}

export default function ProjetoDetailPage({ params }: { params: { id: string } }) {
  const { id } = params
  const [tarefaAbertas, setTarefaAberta] = useState<string | null>(null)
  const [novaForm, setNovaForm] = useState<NewTarefaForm | null>(null)
  const [salvando, setSalvando] = useState(false)

  const { data: projeto, isLoading, mutate } = useSWR<Projeto>(
    `/api/projetos/${id}`,
    fetcher
  )

  const handleCreateTarefa = async () => {
    if (!novaForm?.titulo.trim() || !projeto) return
    setSalvando(true)
    try {
      const res = await fetch(`/api/projetos/${id}/tarefas`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          titulo: novaForm.titulo.trim(),
          sprintId: novaForm.sprintId || undefined,
        }),
      })
      if (res.ok) {
        setNovaForm(null)
        mutate()
      }
    } finally {
      setSalvando(false)
    }
  }

  const handleToggleTarefa = async (tarefa: Tarefa) => {
    const novoStatus: StatusTarefa = tarefa.status === 'CONCLUIDA' ? 'PENDENTE' : 'CONCLUIDA'
    await fetch(`/api/tarefas/${tarefa.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: novoStatus }),
    })
    mutate()
  }

  if (isLoading) {
    return (
      <div className="p-6 space-y-4">
        <Skeleton className="h-8 w-48 bg-surface-2" />
        <Skeleton className="h-4 w-64 bg-surface-2" />
        <div className="space-y-2 mt-6">
          {[1, 2, 3].map((i) => <Skeleton key={i} className="h-12 w-full bg-surface-2" />)}
        </div>
      </div>
    )
  }

  if (!projeto) {
    return (
      <div className="p-6 text-center">
        <p className="text-muted-foreground">Projeto não encontrado</p>
        <Link href="/projetos" className="text-gold-400 text-sm mt-2 inline-block">← Voltar</Link>
      </div>
    )
  }

  const tarefasSemSprint = projeto.tarefas.filter((t) => !t.sprintId)
  const totalConcluidas = projeto.tarefas.filter((t) => t.status === 'CONCLUIDA').length
  const progresso = projeto.tarefas.length > 0
    ? Math.round((totalConcluidas / projeto.tarefas.length) * 100)
    : 0

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-6 py-4 border-b border-surface-3">
        <Link href="/projetos" className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground mb-3 w-fit">
          <ArrowLeft className="w-3.5 h-3.5" /> Projetos
        </Link>
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-lg font-semibold text-foreground">{projeto.nome}</h1>
            <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5">
              <span className="flex items-center gap-1">
                <Building2 className="w-3 h-3" />
                {projeto.lead.empresa ?? projeto.lead.nome}
              </span>
              <span>·</span>
              <span>{projeto.tipoServico}</span>
              <span>·</span>
              <span className="flex items-center gap-1">
                <Calendar className="w-3 h-3" />
                {formatDate(projeto.createdAt)}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">{progresso}% completo</span>
            <div className="w-24 h-1.5 bg-surface-3 rounded-full overflow-hidden">
              <div className="h-full bg-gold-400 rounded-full" style={{ width: `${progresso}%` }} />
            </div>
          </div>
        </div>
      </div>

      {/* Conteúdo */}
      <div className="flex-1 overflow-y-auto px-6 py-4 space-y-6">
        {/* Tarefas sem sprint */}
        <TarefaGroup
          titulo="Backlog"
          tarefas={tarefasSemSprint}
          onClickTarefa={setTarefaAberta}
          onToggle={handleToggleTarefa}
          onNovaClick={() => setNovaForm({ titulo: '', sprintId: '' })}
        />

        {/* Sprints */}
        {projeto.sprints.map((sprint) => {
          const tarefasSprint = projeto.tarefas.filter((t) => t.sprintId === sprint.id)
          return (
            <TarefaGroup
              key={sprint.id}
              titulo={sprint.nome}
              subtitulo={`${formatDate(sprint.dataInicio)} → ${formatDate(sprint.dataFim)}`}
              tarefas={tarefasSprint}
              onClickTarefa={setTarefaAberta}
              onToggle={handleToggleTarefa}
              onNovaClick={() => setNovaForm({ titulo: '', sprintId: sprint.id })}
            />
          )
        })}

        {/* Formulário nova tarefa */}
        {novaForm !== null && (
          <div className="bg-surface-2 border border-surface-3 rounded-lg p-3 space-y-2">
            <input
              autoFocus
              className="w-full bg-transparent text-sm text-foreground placeholder-muted-foreground outline-none"
              placeholder="Título da tarefa..."
              value={novaForm.titulo}
              onChange={(e) => setNovaForm((prev) => prev ? { ...prev, titulo: e.target.value } : null)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleCreateTarefa()
                if (e.key === 'Escape') setNovaForm(null)
              }}
            />
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                onClick={handleCreateTarefa}
                disabled={!novaForm.titulo.trim() || salvando}
                className="bg-gold-400 text-surface-base hover:bg-gold-500 h-7 text-xs"
              >
                {salvando && <Loader2 className="w-3 h-3 animate-spin mr-1" />}
                Criar
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setNovaForm(null)}
                className="h-7 text-xs text-muted-foreground"
              >
                Cancelar
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* SlideOver da tarefa */}
      <TarefaSlideOver
        tarefaId={tarefaAbertas}
        projetoId={id}
        onClose={() => setTarefaAberta(null)}
        onUpdate={() => mutate()}
      />
    </div>
  )
}

function TarefaGroup({
  titulo,
  subtitulo,
  tarefas,
  onClickTarefa,
  onToggle,
  onNovaClick,
}: {
  titulo: string
  subtitulo?: string
  tarefas: Tarefa[]
  onClickTarefa: (id: string) => void
  onToggle: (t: Tarefa) => void
  onNovaClick: () => void
}) {
  const [collapsed, setCollapsed] = useState(false)

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between mb-2">
        <button
          className="flex items-center gap-2 group"
          onClick={() => setCollapsed((c) => !c)}
        >
          <Layers className="w-4 h-4 text-muted-foreground" />
          <span className="text-sm font-medium text-foreground">{titulo}</span>
          {subtitulo && <span className="text-xs text-muted-foreground">{subtitulo}</span>}
          <span className="text-xs text-muted-foreground">({tarefas.length})</span>
        </button>
        <Button
          size="icon"
          variant="ghost"
          onClick={onNovaClick}
          className="w-6 h-6 text-muted-foreground hover:text-gold-400"
        >
          <Plus className="w-3.5 h-3.5" />
        </Button>
      </div>

      {!collapsed && (
        <div className="space-y-1">
          {tarefas.length === 0 && (
            <p className="text-xs text-muted-foreground py-2 pl-2">Nenhuma tarefa</p>
          )}
          {tarefas.map((tarefa) => {
            const config = tarefaStatusConfig[tarefa.status]
            const Icon = config.icon

            return (
              <div
                key={tarefa.id}
                className="flex items-center gap-3 px-3 py-2 bg-surface-1 border border-surface-3 rounded-md hover:border-gold-400/30 group transition-all"
              >
                <button
                  onClick={(e) => { e.stopPropagation(); onToggle(tarefa) }}
                  className={cn('flex-shrink-0 transition-colors', config.color)}
                >
                  <Icon className={cn('w-4 h-4', tarefa.status === 'EM_ANDAMENTO' && 'animate-spin')} />
                </button>

                <button
                  className="flex-1 text-left"
                  onClick={() => onClickTarefa(tarefa.id)}
                >
                  <span className={cn(
                    'text-sm',
                    tarefa.status === 'CONCLUIDA'
                      ? 'line-through text-muted-foreground'
                      : 'text-foreground group-hover:text-gold-400 transition-colors'
                  )}>
                    {tarefa.titulo}
                  </span>
                </button>

                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  {tarefa.prazo && (
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      {formatDate(tarefa.prazo)}
                    </span>
                  )}
                  {tarefa.detalhamentos.length > 0 && (
                    <span className="text-[10px] bg-surface-3 px-1.5 rounded">
                      {tarefa.detalhamentos.length} notas
                    </span>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
