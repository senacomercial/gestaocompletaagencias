'use client'

import { useState, useCallback } from 'react'
import {
  DndContext,
  DragEndEvent,
  DragOverEvent,
  DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
  DragOverlay,
} from '@dnd-kit/core'
import { Plus, ChevronDown } from 'lucide-react'
import { toast } from 'sonner'
import { useFunis } from '@/hooks/useFunis'
import { useKanban } from '@/hooks/useKanban'
import type { LeadComDetalhes, FunilComEtapas } from '@/types'
import { KanbanColumn } from './KanbanColumn'
import { LeadCard } from './LeadCard'
import { LeadSlideOver } from './LeadSlideOver'
import { NewLeadModal } from './NewLeadModal'
import { VendaModal } from './VendaModal'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'

interface KanbanViewProps {
  initialFunis: FunilComEtapas[]
}

export function KanbanView({ initialFunis }: KanbanViewProps) {
  const { funis, mutate: mutateFunis } = useFunis()
  const allFunis: FunilComEtapas[] = (funis.length > 0 ? funis : initialFunis) as FunilComEtapas[]

  const [selectedFunilId, setSelectedFunilId] = useState<string>(allFunis[0]?.id ?? '')
  const [activeLead, setActiveLead] = useState<LeadComDetalhes | null>(null)
  const [slideOverLead, setSlideOverLead] = useState<LeadComDetalhes | null>(null)
  const [slideOverOpen, setSlideOverOpen] = useState(false)
  const [newLeadOpen, setNewLeadOpen] = useState(false)
  const [funilMenuOpen, setFunilMenuOpen] = useState(false)

  // Estado para VendaModal
  const [vendaLead, setVendaLead] = useState<LeadComDetalhes | null>(null)
  const [vendaEtapaId, setVendaEtapaId] = useState<string>('')
  const [vendaEtapaAnteriorId, setVendaEtapaAnteriorId] = useState<string>('')
  const [vendaOpen, setVendaOpen] = useState(false)

  const initialKanban = allFunis.find((f) => f.id === selectedFunilId) ?? null
  const { kanban, isLoading, mutate } = useKanban(selectedFunilId, initialKanban)

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  )

  const handleDragStart = useCallback((event: DragStartEvent) => {
    const lead = event.active.data.current?.lead as LeadComDetalhes
    setActiveLead(lead)
  }, [])

  const handleDragOver = useCallback((_event: DragOverEvent) => {}, [])

  const handleDragEnd = useCallback(
    async (event: DragEndEvent) => {
      setActiveLead(null)
      const { active, over } = event
      if (!over || !kanban) return

      const lead = active.data.current?.lead as LeadComDetalhes
      const novaEtapaId = over.id as string

      if (lead.etapaId === novaEtapaId) return

      // Verificar se é etapa de venda realizada
      const novaEtapa = kanban.etapas.find((e) => e.id === novaEtapaId)
      if (novaEtapa?.isVendaRealizada && lead.status !== 'VENDA_REALIZADA') {
        setVendaLead(lead)
        setVendaEtapaId(novaEtapaId)
        setVendaEtapaAnteriorId(lead.etapaId)
        setVendaOpen(true)
        return
      }

      // Optimistic update
      mutate(
        (prev) => {
          if (!prev) return prev
          return {
            ...prev,
            etapas: prev.etapas.map((etapa) => {
              if (etapa.id === lead.etapaId) {
                return { ...etapa, leads: etapa.leads.filter((l) => l.id !== lead.id) }
              }
              if (etapa.id === novaEtapaId) {
                const novaEtapaData = prev.etapas.find((e) => e.id === novaEtapaId)!
                return {
                  ...etapa,
                  leads: [
                    ...etapa.leads,
                    { ...lead, etapaId: novaEtapaId, etapa: { id: novaEtapaData.id, nome: novaEtapaData.nome, cor: novaEtapaData.cor, isVendaRealizada: novaEtapaData.isVendaRealizada } },
                  ],
                }
              }
              return etapa
            }),
          }
        },
        { revalidate: false }
      )

      try {
        const res = await fetch(`/api/leads/${lead.id}/etapa`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ etapaId: novaEtapaId, funilId: kanban.id }),
        })
        if (!res.ok) throw new Error('Falha ao mover lead')
        mutate()
      } catch {
        toast.error('Erro ao mover lead')
        mutate()
      }
    },
    [kanban, mutate]
  )

  const handleVendaSuccess = () => {
    mutate()
    mutateFunis()
  }

  const handleVendaCancel = () => {
    // Rollback — manter lead na etapa anterior (nenhum update foi feito)
    mutate()
  }

  const handleLeadClick = (lead: LeadComDetalhes) => {
    setSlideOverLead(lead)
    setSlideOverOpen(true)
  }

  const handleLeadUpdate = (updated: LeadComDetalhes) => {
    mutate(
      (prev) => {
        if (!prev) return prev
        return {
          ...prev,
          etapas: prev.etapas.map((etapa) => ({
            ...etapa,
            leads: etapa.leads.map((l) => (l.id === updated.id ? { ...updated } : l)),
          })),
        }
      },
      { revalidate: false }
    )
  }

  const handleLeadDelete = (leadId: string) => {
    mutate(
      (prev) => {
        if (!prev) return prev
        return {
          ...prev,
          etapas: prev.etapas.map((etapa) => ({
            ...etapa,
            leads: etapa.leads.filter((l) => l.id !== leadId),
          })),
        }
      },
      { revalidate: false }
    )
    mutateFunis()
  }

  const selectedFunil = allFunis.find((f) => f.id === selectedFunilId)

  return (
    <div className="flex flex-col h-full">
      {/* Toolbar */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-surface-3">
        <div className="relative">
          <button
            onClick={() => setFunilMenuOpen(!funilMenuOpen)}
            className="flex items-center gap-2 rounded-lg border border-surface-3 bg-surface-2 px-3 py-2 text-sm font-medium text-foreground hover:border-gold-500/40 transition-colors"
          >
            {selectedFunil?.nome ?? 'Selecione um funil'}
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          </button>

          {funilMenuOpen && (
            <div className="absolute top-full left-0 mt-1 z-50 min-w-[200px] rounded-lg border border-surface-3 bg-surface-1 shadow-lg py-1">
              {allFunis.map((funil) => (
                <button
                  key={funil.id}
                  onClick={() => {
                    setSelectedFunilId(funil.id)
                    setFunilMenuOpen(false)
                  }}
                  className={`w-full px-3 py-2 text-left text-sm hover:bg-surface-2 transition-colors ${
                    funil.id === selectedFunilId ? 'text-gold-500 font-medium' : 'text-foreground'
                  }`}
                >
                  {funil.nome}
                </button>
              ))}
            </div>
          )}
        </div>

        <Button onClick={() => setNewLeadOpen(true)} size="sm">
          <Plus className="h-4 w-4 mr-1" />
          Novo Lead
        </Button>
      </div>

      {/* Kanban board */}
      <div className="flex-1 overflow-x-auto px-6 py-4">
        {isLoading ? (
          <div className="flex gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="w-72 flex-shrink-0 space-y-2">
                <Skeleton className="h-10 w-full rounded-lg" />
                <Skeleton className="h-24 w-full rounded-lg" />
                <Skeleton className="h-24 w-full rounded-lg" />
              </div>
            ))}
          </div>
        ) : kanban ? (
          <DndContext
            sensors={sensors}
            onDragStart={handleDragStart}
            onDragOver={handleDragOver}
            onDragEnd={handleDragEnd}
          >
            <div className="flex gap-4 h-full">
              {kanban.etapas.map((coluna) => (
                <KanbanColumn key={coluna.id} coluna={coluna} onLeadClick={handleLeadClick} />
              ))}
            </div>

            <DragOverlay>
              {activeLead && (
                <div className="rotate-2 shadow-2xl opacity-90">
                  <LeadCard lead={activeLead} onClick={() => {}} />
                </div>
              )}
            </DragOverlay>
          </DndContext>
        ) : (
          <div className="flex items-center justify-center h-64 text-muted-foreground">
            Nenhum funil encontrado
          </div>
        )}
      </div>

      {/* Modals */}
      <LeadSlideOver
        lead={slideOverLead}
        open={slideOverOpen}
        onClose={() => setSlideOverOpen(false)}
        onUpdate={handleLeadUpdate}
        onDelete={handleLeadDelete}
      />

      <NewLeadModal
        open={newLeadOpen}
        onClose={() => setNewLeadOpen(false)}
        onCreated={() => mutate()}
        funis={allFunis}
        defaultFunilId={selectedFunilId}
      />

      <VendaModal
        lead={vendaLead}
        etapaId={vendaEtapaId}
        open={vendaOpen}
        onClose={() => setVendaOpen(false)}
        onSuccess={handleVendaSuccess}
        onCancel={handleVendaCancel}
      />
    </div>
  )
}
