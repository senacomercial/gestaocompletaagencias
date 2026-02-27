import { type LucideIcon, TrendingUp, TrendingDown } from 'lucide-react'
import { cn, formatCurrency } from '@/lib/utils'

interface KpiCardProps {
  title: string
  value: number
  icon: LucideIcon
  format?: 'currency' | 'number'
  subtitle?: string
  iconColor?: string
  trend?: { value: number }
}

// Converte "text-gold-400" → "bg-gold-400/10"
function iconBgClass(iconColor: string) {
  return iconColor
    .replace('text-', 'bg-')
    .replace(/-([\w]+)$/, (_, shade) => `-${shade}/10`)
}

export function KpiCard({
  title,
  value,
  icon: Icon,
  format = 'number',
  subtitle,
  iconColor = 'text-gold-400',
  trend,
}: KpiCardProps) {
  const displayValue =
    format === 'currency'
      ? formatCurrency(value)
      : value.toLocaleString('pt-BR')

  return (
    <div className="card-agency p-5 flex flex-col gap-4 hover:border-gold-400/20 transition-all duration-200 group">
      {/* Título + ícone */}
      <div className="flex items-center justify-between">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
          {title}
        </p>
        <div
          className={cn(
            'p-2 rounded-lg transition-all duration-200 group-hover:scale-105',
            iconBgClass(iconColor)
          )}
        >
          <Icon className={cn('w-4 h-4', iconColor)} />
        </div>
      </div>

      {/* Valor */}
      <div>
        <p className="text-2xl font-black bg-gradient-to-r from-gold-400 to-bronze-400 bg-clip-text text-transparent tracking-tight">
          {displayValue}
        </p>

        <div className="flex items-center gap-2 mt-1 flex-wrap">
          {subtitle && (
            <p className="text-xs text-muted-foreground">{subtitle}</p>
          )}

          {trend !== undefined && (
            <span
              className={cn(
                'inline-flex items-center gap-0.5 text-[10px] font-bold px-1.5 py-0.5 rounded-full',
                trend.value >= 0
                  ? 'bg-emerald-500/10 text-emerald-400'
                  : 'bg-red-500/10 text-red-400'
              )}
            >
              {trend.value >= 0
                ? <TrendingUp className="w-3 h-3" />
                : <TrendingDown className="w-3 h-3" />
              }
              {Math.abs(trend.value)}%
            </span>
          )}
        </div>
      </div>
    </div>
  )
}

export function KpiCardSkeleton() {
  return (
    <div className="card-agency p-5 flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div className="h-3 w-24 animate-shimmer rounded-full" />
        <div className="h-9 w-9 animate-shimmer rounded-lg" />
      </div>
      <div>
        <div className="h-7 w-32 animate-shimmer rounded-lg" />
        <div className="h-3 w-20 animate-shimmer rounded-full mt-2" />
      </div>
    </div>
  )
}
