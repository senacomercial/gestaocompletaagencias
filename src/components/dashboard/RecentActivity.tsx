import Link from 'next/link'
import { UserPlus, TrendingUp, CheckCircle2, FolderPlus, ArrowRight } from 'lucide-react'
import { formatRelativeDate } from '@/lib/utils'
import type { AtividadeItem } from '@/lib/services/dashboard'

const tipoConfig = {
  lead_criado: {
    icon: UserPlus,
    color: 'text-status-info',
    bg: 'bg-status-info/10',
    label: 'Lead criado',
  },
  venda_realizada: {
    icon: TrendingUp,
    color: 'text-status-success',
    bg: 'bg-status-success/10',
    label: 'Venda realizada',
  },
  tarefa_concluida: {
    icon: CheckCircle2,
    color: 'text-gold-400',
    bg: 'bg-gold-400/10',
    label: 'Tarefa concluída',
  },
  projeto_criado: {
    icon: FolderPlus,
    color: 'text-bronze-400',
    bg: 'bg-bronze-400/10',
    label: 'Projeto criado',
  },
}

interface RecentActivityProps {
  atividades: AtividadeItem[]
}

export function RecentActivity({ atividades }: RecentActivityProps) {
  return (
    <div className="card-agency flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-surface-3">
        <h3 className="text-sm font-semibold text-foreground">Atividade Recente</h3>
        <Link
          href="/crm"
          className="flex items-center gap-1 text-xs text-muted-foreground hover:text-gold-400 transition-colors"
        >
          Ver CRM
          <ArrowRight className="w-3 h-3" />
        </Link>
      </div>

      {/* Lista */}
      <div className="flex-1 overflow-y-auto">
        {atividades.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center px-6">
            <div className="w-10 h-10 rounded-full bg-surface-2 flex items-center justify-center mb-3">
              <CheckCircle2 className="w-5 h-5 text-muted-foreground/40" />
            </div>
            <p className="text-sm text-muted-foreground">Nenhuma atividade ainda</p>
            <p className="text-xs text-muted-foreground/60 mt-1">
              As ações da equipe aparecerão aqui
            </p>
          </div>
        ) : (
          <div className="relative px-5 py-4">
            {/* Linha timeline */}
            <div className="absolute left-[28px] top-8 bottom-8 w-px bg-surface-3" />

            <div className="space-y-4">
              {atividades.map((item, idx) => {
                const config = tipoConfig[item.tipo]
                const Icon = config.icon

                return (
                  <div key={item.id} className="relative flex items-start gap-3">
                    {/* Ícone na timeline */}
                    <div
                      className={`relative z-10 flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center ${config.bg} border border-surface-3`}
                    >
                      <Icon className={`w-3.5 h-3.5 ${config.color}`} />
                    </div>

                    {/* Conteúdo */}
                    <div className="flex-1 min-w-0 pt-0.5">
                      <p className="text-xs font-medium text-muted-foreground/60 leading-none mb-0.5">
                        {config.label}
                      </p>
                      <p className="text-sm text-foreground truncate leading-snug">
                        {item.descricao.replace(/^[^:]+:\s*/, '')}
                      </p>
                      <p className="text-[11px] text-muted-foreground mt-0.5">
                        {formatRelativeDate(item.createdAt)}
                      </p>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
