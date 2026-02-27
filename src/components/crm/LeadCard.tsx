'use client'

import { useDraggable } from '@dnd-kit/core'
import { CSS } from '@dnd-kit/utilities'
import { Building2, Mail, Phone, MessageSquare } from 'lucide-react'
import type { LeadComDetalhes } from '@/types'
import { TagBadge } from './TagBadge'
import { useUnreadMessages } from '@/hooks/useUnreadMessages'

interface LeadCardProps {
  lead: LeadComDetalhes
  onClick: (lead: LeadComDetalhes) => void
}

export function LeadCard({ lead, onClick }: LeadCardProps) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: lead.id,
    data: { lead },
  })

  const unreadCount = useUnreadMessages((s) => s.counts[lead.id] ?? 0)
  const clearUnread = useUnreadMessages((s) => s.clear)

  const style = {
    transform: CSS.Translate.toString(transform),
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 999 : 'auto',
  }

  const handleClick = () => {
    clearUnread(lead.id)
    onClick(lead)
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className="group relative rounded-lg border border-surface-3 bg-surface-2 p-3 shadow-sm cursor-grab active:cursor-grabbing hover:border-gold-500/40 transition-all duration-150 select-none"
      onClick={handleClick}
    >
      {/* Badge de mensagens não lidas */}
      {unreadCount > 0 && (
        <div className="absolute -top-1.5 -right-1.5 flex h-5 min-w-[20px] items-center justify-center rounded-full bg-emerald-500 px-1 text-[10px] font-bold text-white z-10">
          <MessageSquare className="h-2.5 w-2.5 mr-0.5" />
          {unreadCount > 99 ? '99+' : unreadCount}
        </div>
      )}

      {/* Nome */}
      <p className="text-sm font-medium text-foreground truncate">{lead.nome}</p>

      {/* Empresa */}
      {lead.empresa && (
        <div className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
          <Building2 className="h-3 w-3 flex-shrink-0" />
          <span className="truncate">{lead.empresa}</span>
        </div>
      )}

      {/* Contato */}
      <div className="mt-1 flex gap-2">
        {lead.email && (
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <Mail className="h-3 w-3 flex-shrink-0" />
          </div>
        )}
        {lead.telefone && (
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <Phone className="h-3 w-3 flex-shrink-0" />
          </div>
        )}
      </div>

      {/* Tags */}
      {lead.tags.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1">
          {lead.tags.slice(0, 3).map(({ tag }) => (
            <TagBadge key={tag.id} nome={tag.nome} cor={tag.cor} />
          ))}
          {lead.tags.length > 3 && (
            <span className="text-[10px] text-muted-foreground">+{lead.tags.length - 3}</span>
          )}
        </div>
      )}

      {/* VGV */}
      {lead.vgvTotal && (
        <div className="mt-2 text-right">
          <span className="text-xs font-semibold text-gold-500">
            {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(lead.vgvTotal))}
          </span>
        </div>
      )}
    </div>
  )
}
