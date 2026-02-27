'use client'

import { useDroppable } from '@dnd-kit/core'
import { TrendingUp } from 'lucide-react'
import type { KanbanColuna, LeadComDetalhes } from '@/types'
import { LeadCard } from './LeadCard'

interface KanbanColumnProps {
  coluna: KanbanColuna
  onLeadClick: (lead: LeadComDetalhes) => void
}

export function KanbanColumn({ coluna, onLeadClick }: KanbanColumnProps) {
  const { setNodeRef, isOver } = useDroppable({ id: coluna.id })

  const vgvTotal = coluna.leads.reduce((acc, lead) => acc + Number(lead.vgvTotal ?? 0), 0)

  return (
    <div className="flex flex-col w-72 flex-shrink-0">
      {/* Header da coluna */}
      <div
        className="flex items-center justify-between rounded-t-lg px-3 py-2"
        style={{ borderTop: `3px solid ${coluna.cor}`, backgroundColor: `${coluna.cor}11` }}
      >
        <div className="flex items-center gap-2">
          <span
            className="h-2.5 w-2.5 rounded-full flex-shrink-0"
            style={{ backgroundColor: coluna.cor }}
          />
          <h3 className="text-sm font-semibold text-foreground truncate max-w-[140px]">{coluna.nome}</h3>
          {coluna.isVendaRealizada && (
            <TrendingUp className="h-3.5 w-3.5 text-emerald-500 flex-shrink-0" />
          )}
        </div>
        <div className="flex items-center gap-1.5">
          <span className="rounded-full bg-surface-3 px-2 py-0.5 text-xs font-medium text-muted-foreground">
            {coluna.leads.length}
          </span>
        </div>
      </div>

      {/* VGV da coluna */}
      {vgvTotal > 0 && (
        <div className="px-3 py-1 bg-surface-2 border-x border-surface-3">
          <span className="text-xs text-muted-foreground">
            {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(vgvTotal)}
          </span>
        </div>
      )}

      {/* Drop zone com cards */}
      <div
        ref={setNodeRef}
        className={`flex-1 min-h-[200px] rounded-b-lg border border-surface-3 bg-surface-1 p-2 space-y-2 transition-colors ${
          isOver ? 'bg-gold-500/5 border-gold-500/30' : ''
        }`}
      >
        {coluna.leads.map((lead) => (
          <LeadCard key={lead.id} lead={lead} onClick={onLeadClick} />
        ))}

        {coluna.leads.length === 0 && !isOver && (
          <div className="flex items-center justify-center h-20 text-xs text-muted-foreground border border-dashed border-surface-3 rounded-md">
            Arraste leads aqui
          </div>
        )}
      </div>
    </div>
  )
}
