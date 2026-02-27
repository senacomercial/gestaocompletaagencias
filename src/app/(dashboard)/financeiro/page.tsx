'use client'

import { useState, useEffect } from 'react'
import useSWR from 'swr'
import {
  TrendingUp, DollarSign, AlertTriangle, CheckCircle2,
  Clock, XCircle, Loader2, ChevronDown, ChevronUp,
  BarChart3, Receipt, FileText,
} from 'lucide-react'
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { cn, formatCurrency, formatDate } from '@/lib/utils'

type StatusLancamento = 'PENDENTE' | 'PAGO' | 'ATRASADO' | 'CANCELADO'
type TipoPagamento = 'RECORRENTE' | 'PARCELADO' | 'AVULSO'

interface DashboardData {
  vgvTotal: string
  mrr: string
  recebidoMes: string
  emAberto: string
  totalAtrasado: string
  taxaInadimplencia: number
  recebPorMes: Array<{ mes: string; valor: number }>
  proximosVencimentos: Array<{
    id: string
    descricao: string
    valor: string
    dataVencimento: string
    lead: { nome: string; empresa: string | null }
  }>
  inadimplentes: Array<{
    id: string
    descricao: string
    valor: string
    dataVencimento: string
    diasAtraso: number
    lead: { nome: string; empresa: string | null }
  }>
  topClientes: Array<{
    leadId: string
    leadNome: string
    empresa: string | null
    totalPago: number
  }>
}

interface Contrato {
  id: string
  valorTotal: string
  recorrenciaMensal: string | null
  tipoPagamento: TipoPagamento
  dataInicio: string
  numeroParcelas: number | null
  ativo: boolean
  lead: { nome: string; empresa: string | null }
  _count: { lancamentos: number }
}

interface Lancamento {
  id: string
  descricao: string
  valor: string
  dataVencimento: string
  dataPagamento: string | null
  valorPago: string | null
  status: StatusLancamento
  contrato: {
    tipoPagamento: TipoPagamento
    lead: { nome: string; empresa: string | null }
  }
}

const fetcher = (url: string) => fetch(url).then((r) => r.json())

type Tab = 'dashboard' | 'lancamentos' | 'contratos'

const statusLanc: Record<StatusLancamento, { label: string; color: string; icon: React.ElementType }> = {
  PENDENTE: { label: 'Pendente', color: 'bg-yellow-500/20 text-yellow-400', icon: Clock },
  PAGO: { label: 'Pago', color: 'bg-emerald-500/20 text-emerald-400', icon: CheckCircle2 },
  ATRASADO: { label: 'Atrasado', color: 'bg-red-500/20 text-red-400', icon: AlertTriangle },
  CANCELADO: { label: 'Cancelado', color: 'bg-surface-3 text-muted-foreground', icon: XCircle },
}

export default function FinanceiroPage() {
  const [tab, setTab] = useState<Tab>('dashboard')
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])
  const [filtroStatus, setFiltroStatus] = useState<string>('todos')
  const [marcandoPago, setMarcandoPago] = useState<string | null>(null)

  const { data: dashboard, isLoading: loadingDash } = useSWR<DashboardData>(
    '/api/financeiro/dashboard', fetcher
  )
  const { data: lancamentos, isLoading: loadingLanc, mutate: mutateLanc } = useSWR<Lancamento[]>(
    tab === 'lancamentos' ? '/api/lancamentos' : null, fetcher
  )
  const { data: contratos, isLoading: loadingContratos } = useSWR<Contrato[]>(
    tab === 'contratos' ? '/api/contratos' : null, fetcher
  )

  const handleMarcarPago = async (id: string) => {
    setMarcandoPago(id)
    try {
      const res = await fetch(`/api/lancamentos/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dataPagamento: new Date().toISOString(), valorPago: null }),
      })
      if (res.ok) mutateLanc()
    } finally {
      setMarcandoPago(null)
    }
  }

  const lancFiltrados = (lancamentos ?? []).filter((l) =>
    filtroStatus === 'todos' || l.status === filtroStatus
  )

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-6 py-4 border-b border-surface-3">
        <h1 className="text-lg font-semibold text-foreground">Financeiro</h1>
        <p className="text-xs text-muted-foreground">Receitas, contratos e lançamentos</p>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 px-6 py-2 border-b border-surface-3">
        {([
          { key: 'dashboard', label: 'Dashboard', icon: BarChart3 },
          { key: 'lancamentos', label: 'Lançamentos', icon: Receipt },
          { key: 'contratos', label: 'Contratos', icon: FileText },
        ] as const).map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={cn(
              'flex items-center gap-1.5 px-3 h-8 rounded-md text-xs font-medium transition-colors',
              tab === key
                ? 'bg-gold-400/20 text-gold-400'
                : 'text-muted-foreground hover:bg-surface-2'
            )}
          >
            <Icon className="w-3.5 h-3.5" />
            {label}
          </button>
        ))}
      </div>

      {/* Conteúdo */}
      <div className="flex-1 overflow-y-auto px-6 py-4">

        {/* ─── DASHBOARD ─── */}
        {tab === 'dashboard' && (
          <div className="space-y-6">
            {loadingDash && (
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-20 bg-surface-2" />)}
              </div>
            )}

            {dashboard && (
              <>
                {/* KPIs */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                  <KpiCard
                    label="VGV Total"
                    value={formatCurrency(parseFloat(dashboard.vgvTotal))}
                    icon={DollarSign}
                    color="text-gold-400"
                  />
                  <KpiCard
                    label="MRR"
                    value={formatCurrency(parseFloat(dashboard.mrr))}
                    icon={TrendingUp}
                    color="text-blue-400"
                  />
                  <KpiCard
                    label="Recebido este Mês"
                    value={formatCurrency(parseFloat(dashboard.recebidoMes))}
                    icon={CheckCircle2}
                    color="text-emerald-400"
                  />
                  <KpiCard
                    label="Em Aberto"
                    value={formatCurrency(parseFloat(dashboard.emAberto))}
                    icon={Clock}
                    color="text-yellow-400"
                  />
                </div>

                {/* Inadimplência */}
                {parseFloat(dashboard.totalAtrasado) > 0 && (
                  <div className="flex items-center gap-3 px-4 py-3 bg-red-500/10 border border-red-500/20 rounded-lg">
                    <AlertTriangle className="w-4 h-4 text-red-400 flex-shrink-0" />
                    <div>
                      <p className="text-sm font-medium text-red-400">
                        {formatCurrency(parseFloat(dashboard.totalAtrasado))} em atraso
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Taxa de inadimplência: {dashboard.taxaInadimplencia.toFixed(1)}%
                      </p>
                    </div>
                  </div>
                )}

                {/* Gráfico — renderizado apenas no cliente para evitar SSR issues com recharts */}
                {mounted && dashboard.recebPorMes.length > 0 && (
                  <div className="bg-surface-1 border border-surface-3 rounded-lg p-4">
                    <p className="text-sm font-medium text-foreground mb-4">Receita Mensal (12 meses)</p>
                    <ResponsiveContainer width="100%" height={200}>
                      <AreaChart data={dashboard.recebPorMes}>
                        <defs>
                          <linearGradient id="colorReceita" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#C8A84B" stopOpacity={0.3} />
                            <stop offset="95%" stopColor="#C8A84B" stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                        <XAxis
                          dataKey="mes"
                          tick={{ fontSize: 10, fill: '#6B7280' }}
                          axisLine={false}
                          tickLine={false}
                        />
                        <YAxis
                          tick={{ fontSize: 10, fill: '#6B7280' }}
                          axisLine={false}
                          tickLine={false}
                          tickFormatter={(v) => `R$${(v / 1000).toFixed(0)}k`}
                        />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: '#1A1A1A',
                            border: '1px solid #333',
                            borderRadius: '8px',
                            fontSize: '12px',
                          }}
                          formatter={(value: number) => [formatCurrency(value), 'Recebido']}
                        />
                        <Area
                          type="monotone"
                          dataKey="valor"
                          stroke="#C8A84B"
                          strokeWidth={2}
                          fill="url(#colorReceita)"
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                )}

                {/* Grid: Próximos vencimentos + Inadimplentes */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  {/* Próximos vencimentos */}
                  <div className="bg-surface-1 border border-surface-3 rounded-lg p-4">
                    <p className="text-sm font-medium text-foreground mb-3">Próximos 15 dias</p>
                    {dashboard.proximosVencimentos.length === 0 ? (
                      <p className="text-xs text-muted-foreground">Nenhum vencimento próximo</p>
                    ) : (
                      <div className="space-y-2">
                        {dashboard.proximosVencimentos.map((l) => (
                          <div key={l.id} className="flex items-center justify-between">
                            <div>
                              <p className="text-xs text-foreground">{l.lead.empresa ?? l.lead.nome}</p>
                              <p className="text-[10px] text-muted-foreground">{formatDate(l.dataVencimento)}</p>
                            </div>
                            <span className="text-xs font-medium text-foreground">
                              {formatCurrency(parseFloat(l.valor))}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Top clientes */}
                  <div className="bg-surface-1 border border-surface-3 rounded-lg p-4">
                    <p className="text-sm font-medium text-foreground mb-3">Top Clientes</p>
                    {dashboard.topClientes.length === 0 ? (
                      <p className="text-xs text-muted-foreground">Nenhum pagamento registrado</p>
                    ) : (
                      <div className="space-y-2">
                        {dashboard.topClientes.map((c, i) => (
                          <div key={c.leadId} className="flex items-center gap-2">
                            <span className="text-[10px] text-muted-foreground w-4">{i + 1}.</span>
                            <div className="flex-1 min-w-0">
                              <p className="text-xs text-foreground truncate">{c.empresa ?? c.leadNome}</p>
                            </div>
                            <span className="text-xs font-medium text-gold-400">
                              {formatCurrency(c.totalPago)}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </>
            )}
          </div>
        )}

        {/* ─── LANÇAMENTOS ─── */}
        {tab === 'lancamentos' && (
          <div className="space-y-4">
            {/* Filtros status */}
            <div className="flex items-center gap-1">
              {['todos', 'PENDENTE', 'ATRASADO', 'PAGO', 'CANCELADO'].map((s) => (
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
                  {s === 'todos' ? 'Todos' : statusLanc[s as StatusLancamento]?.label ?? s}
                </button>
              ))}
            </div>

            {loadingLanc && (
              <div className="space-y-2">
                {[1, 2, 3].map((i) => <Skeleton key={i} className="h-16 bg-surface-2" />)}
              </div>
            )}

            <div className="space-y-1.5">
              {lancFiltrados.map((l) => {
                const cfg = statusLanc[l.status]
                const Icon = cfg.icon
                return (
                  <div
                    key={l.id}
                    className="flex items-center gap-4 px-4 py-3 bg-surface-1 border border-surface-3 rounded-lg"
                  >
                    <Icon className={cn('w-4 h-4 flex-shrink-0', cfg.color.split(' ')[1])} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-foreground truncate">
                        {l.contrato.lead.empresa ?? l.contrato.lead.nome}
                      </p>
                      <p className="text-xs text-muted-foreground">{l.descricao}</p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="text-sm font-medium text-foreground">
                        {formatCurrency(parseFloat(l.valor))}
                      </p>
                      <p className="text-xs text-muted-foreground">{formatDate(l.dataVencimento)}</p>
                    </div>
                    <span className={cn('px-2 py-0.5 rounded-full text-[10px] font-medium', cfg.color)}>
                      {cfg.label}
                    </span>
                    {(l.status === 'PENDENTE' || l.status === 'ATRASADO') && (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-xs h-7 text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/10"
                        onClick={() => handleMarcarPago(l.id)}
                        disabled={marcandoPago === l.id}
                      >
                        {marcandoPago === l.id
                          ? <Loader2 className="w-3 h-3 animate-spin" />
                          : 'Marcar Pago'
                        }
                      </Button>
                    )}
                  </div>
                )
              })}

              {!loadingLanc && lancFiltrados.length === 0 && (
                <div className="py-12 text-center">
                  <Receipt className="w-8 h-8 text-muted-foreground/30 mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">Nenhum lançamento encontrado</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ─── CONTRATOS ─── */}
        {tab === 'contratos' && (
          <div className="space-y-2">
            {loadingContratos && (
              <div className="space-y-2">
                {[1, 2, 3].map((i) => <Skeleton key={i} className="h-20 bg-surface-2" />)}
              </div>
            )}

            {!loadingContratos && (contratos ?? []).length === 0 && (
              <div className="py-12 text-center">
                <FileText className="w-8 h-8 text-muted-foreground/30 mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">Nenhum contrato ativo</p>
              </div>
            )}

            {(contratos ?? []).map((c) => (
              <div
                key={c.id}
                className={cn(
                  'px-4 py-3 bg-surface-1 border rounded-lg',
                  c.ativo ? 'border-surface-3' : 'border-surface-3 opacity-60'
                )}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-foreground">
                      {c.lead.empresa ?? c.lead.nome}
                    </p>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                      <span>{formatDate(c.dataInicio)}</span>
                      <span>·</span>
                      <span>{c.tipoPagamento === 'RECORRENTE' ? 'Recorrente' : c.tipoPagamento === 'PARCELADO' ? 'Parcelado' : 'Avulso'}</span>
                      {c.recorrenciaMensal && (
                        <>
                          <span>·</span>
                          <span>{formatCurrency(parseFloat(c.recorrenciaMensal))}/mês</span>
                        </>
                      )}
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-foreground">
                      {formatCurrency(parseFloat(c.valorTotal))}
                    </p>
                    <span className={cn(
                      'text-[10px] px-2 py-0.5 rounded-full font-medium',
                      c.ativo ? 'bg-emerald-500/20 text-emerald-400' : 'bg-surface-3 text-muted-foreground'
                    )}>
                      {c.ativo ? 'Ativo' : 'Encerrado'}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function KpiCard({
  label,
  value,
  icon: Icon,
  color,
}: {
  label: string
  value: string
  icon: React.ElementType
  color: string
}) {
  return (
    <div className="bg-surface-1 border border-surface-3 rounded-lg p-4">
      <div className="flex items-center justify-between mb-2">
        <p className="text-xs text-muted-foreground">{label}</p>
        <Icon className={cn('w-4 h-4', color)} />
      </div>
      <p className="text-lg font-semibold text-foreground">{value}</p>
    </div>
  )
}
