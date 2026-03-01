'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import {
  Camera, TrendingUp, Clock, CheckCircle2, DollarSign,
  Sparkles, ArrowRight, AlertCircle, Package, Loader2,
  BarChart2, ArrowUpRight, ArrowDownRight,
} from 'lucide-react'
import { useSocket } from '@/hooks/useSocket'

interface DashboardData {
  totalLeads: number
  emProducao: number
  entreguesMes: number
  receitaMes: number
  aguardandoAprovacao: number
  taxaConversao: number
  pedidosRecentes: Array<{
    id: string
    status: string
    tipoFoto: string
    valorCobrado: number | null
    criadoEm: string
    lead: { nome: string; empresa: string | null }
  }>
}

interface RelatorioData {
  pedidosCriados: number
  pedidosConcluidos: number
  receita: number
  taxaConversao: number
  tempoMedioHoras: number
}

const STATUS_LABELS: Record<string, string> = {
  NOVO_LEAD: 'Novo Lead',
  EM_QUALIFICACAO: 'Em Qualificação',
  PROPOSTA_ENVIADA: 'Proposta Enviada',
  FOLLOWUP_1: 'Follow-up 1',
  FOLLOWUP_2: 'Follow-up 2',
  AGUARDANDO_PAGAMENTO: 'Aguard. Pagamento',
  PAGAMENTO_CONFIRMADO: 'Pgt. Confirmado',
  EM_PRODUCAO: 'Em Produção',
  AGUARDANDO_APROVACAO: 'Aguard. Aprovação',
  EM_REVISAO: 'Em Revisão',
  ENTREGUE: 'Entregue',
  CANCELADO: 'Cancelado',
  PERDIDO: 'Perdido',
}

const STATUS_COLORS: Record<string, string> = {
  NOVO_LEAD: 'bg-blue-500/10 text-blue-400',
  EM_QUALIFICACAO: 'bg-violet-500/10 text-violet-400',
  PROPOSTA_ENVIADA: 'bg-amber-500/10 text-amber-400',
  FOLLOWUP_1: 'bg-orange-500/10 text-orange-400',
  FOLLOWUP_2: 'bg-red-500/10 text-red-400',
  AGUARDANDO_PAGAMENTO: 'bg-gold-400/10 text-gold-400',
  PAGAMENTO_CONFIRMADO: 'bg-emerald-500/10 text-emerald-400',
  EM_PRODUCAO: 'bg-cyan-500/10 text-cyan-400',
  AGUARDANDO_APROVACAO: 'bg-purple-500/10 text-purple-400',
  EM_REVISAO: 'bg-amber-500/10 text-amber-400',
  ENTREGUE: 'bg-green-500/10 text-green-400',
  CANCELADO: 'bg-surface-3 text-muted-foreground',
  PERDIDO: 'bg-red-500/10 text-red-400',
}

const TIPO_LABELS: Record<string, string> = {
  RETRATO_PROFISSIONAL: 'Retrato Profissional',
  FOTO_PRODUTO: 'Foto de Produto',
  FOTO_CORPORATIVA: 'Foto Corporativa',
  BANNER_REDES_SOCIAIS: 'Banner Redes Sociais',
  FOTO_PERFIL: 'Foto de Perfil',
  CUSTOM: 'Personalizado',
}

function KpiCard({
  label, value, sub, icon: Icon, color,
}: {
  label: string
  value: string | number
  sub?: string
  icon: React.ElementType
  color: string
}) {
  return (
    <div className="card-agency p-5 flex items-start gap-4">
      <div className={`p-2.5 rounded-lg ${color}`}>
        <Icon size={20} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="section-label">{label}</p>
        <p className="text-2xl font-bold text-foreground mt-0.5">{value}</p>
        {sub && <p className="text-xs text-muted-foreground mt-1">{sub}</p>}
      </div>
    </div>
  )
}

export default function FotoIADashboard() {
  const [data, setData]         = useState<DashboardData | null>(null)
  const [loading, setLoading]   = useState(true)
  const [relatorio, setRelatorio] = useState<RelatorioData | null>(null)
  const { on }                  = useSocket()

  const fetchDashboard = useCallback(() => {
    fetch('/api/foto-ia/dashboard')
      .then(r => r.json())
      .then(d => { setData(d); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  useEffect(() => {
    fetchDashboard()
    fetch('/api/foto-ia/relatorio?periodo=semana')
      .then(r => r.json())
      .then(d => setRelatorio(d))
      .catch(() => {})
  }, [fetchDashboard])

  // Real-time: atualizar dashboard quando status de pedido mudar
  useEffect(() => {
    const unsub = on('pedido:status-update', () => {
      fetchDashboard()
    })
    return unsub
  }, [on, fetchDashboard])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 size={32} className="animate-spin text-gold-400" />
      </div>
    )
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-violet-500/10">
            <Camera size={22} className="text-violet-400" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-foreground">FotoIA</h1>
            <p className="text-sm text-muted-foreground">Serviço automatizado de fotos profissionais por IA</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/foto-ia/pedidos"
            className="flex items-center gap-1.5 px-3 py-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            Ver pedidos
            <ArrowRight size={14} />
          </Link>
          <Link
            href="/crm"
            className="btn-gold text-sm flex items-center gap-1.5"
          >
            <Sparkles size={14} />
            Pipeline FotoIA
          </Link>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        <KpiCard
          label="Leads no Pipeline"
          value={data?.totalLeads ?? 0}
          sub="aguardando ação"
          icon={TrendingUp}
          color="bg-blue-500/10 text-blue-400"
        />
        <KpiCard
          label="Em Produção"
          value={data?.emProducao ?? 0}
          sub="gerando agora"
          icon={Sparkles}
          color="bg-violet-500/10 text-violet-400"
        />
        <KpiCard
          label="Aguard. Aprovação"
          value={data?.aguardandoAprovacao ?? 0}
          sub="aguardando cliente"
          icon={AlertCircle}
          color="bg-amber-500/10 text-amber-400"
        />
        <KpiCard
          label="Entregues este Mês"
          value={data?.entreguesMes ?? 0}
          sub="pedidos concluídos"
          icon={CheckCircle2}
          color="bg-green-500/10 text-green-400"
        />
        <KpiCard
          label="Receita do Mês"
          value={`R$ ${(data?.receitaMes ?? 0).toLocaleString('pt-BR', { minimumFractionDigits: 0 })}`}
          sub="faturamento FotoIA"
          icon={DollarSign}
          color="bg-gold-400/10 text-gold-400"
        />
        <KpiCard
          label="Taxa de Conversão"
          value={`${data?.taxaConversao ?? 0}%`}
          sub="lead → pagamento"
          icon={Package}
          color="bg-emerald-500/10 text-emerald-400"
        />
      </div>

      {/* Conteúdo central */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Pedidos Recentes */}
        <div className="lg:col-span-2 card-agency p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-foreground">Pedidos Recentes</h2>
            <Link href="/foto-ia/pedidos" className="text-xs text-gold-400 hover:text-gold-300 transition-colors">
              Ver todos →
            </Link>
          </div>

          {!data?.pedidosRecentes?.length ? (
            <div className="flex flex-col items-center justify-center py-10 text-muted-foreground">
              <Camera size={32} className="mb-3 opacity-40" />
              <p className="text-sm">Nenhum pedido ainda</p>
              <p className="text-xs mt-1">Os pedidos aparecerão aqui quando leads entrarem no pipeline FotoIA</p>
            </div>
          ) : (
            <div className="space-y-3">
              {data.pedidosRecentes.map(pedido => (
                <Link
                  key={pedido.id}
                  href={`/foto-ia/pedidos/${pedido.id}`}
                  className="flex items-center gap-3 p-3 rounded-lg bg-surface-2 hover:bg-surface-3 transition-colors group"
                >
                  <div className="p-2 rounded-lg bg-violet-500/10">
                    <Camera size={16} className="text-violet-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{pedido.lead.nome}</p>
                    <p className="text-xs text-muted-foreground">{TIPO_LABELS[pedido.tipoFoto] ?? pedido.tipoFoto}</p>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[pedido.status] ?? 'bg-surface-3 text-muted-foreground'}`}>
                      {STATUS_LABELS[pedido.status] ?? pedido.status}
                    </span>
                    {pedido.valorCobrado && (
                      <span className="text-xs text-gold-400 font-semibold">
                        R$ {Number(pedido.valorCobrado).toLocaleString('pt-BR')}
                      </span>
                    )}
                  </div>
                  <ArrowRight size={14} className="text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Info do Squad + Ações Rápidas */}
        <div className="space-y-4">
          {/* Squad Status */}
          <div className="card-agency p-5">
            <h2 className="font-semibold text-foreground mb-3">Squad FotoIA</h2>
            <div className="space-y-2.5">
              {[
                { icon: '🤝', label: 'Vendedor IA', status: 'Disponível', color: 'text-green-400' },
                { icon: '💳', label: 'Cobrador IA', status: 'Disponível', color: 'text-green-400' },
                { icon: '🎨', label: 'Produtor IA', status: 'Disponível', color: 'text-green-400' },
                { icon: '📦', label: 'Entregador IA', status: 'Disponível', color: 'text-green-400' },
              ].map(agent => (
                <div key={agent.label} className="flex items-center gap-2.5">
                  <span className="text-base">{agent.icon}</span>
                  <span className="text-sm text-foreground flex-1">{agent.label}</span>
                  <span className={`text-xs font-medium ${agent.color}`}>{agent.status}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Ações Rápidas */}
          <div className="card-agency p-5">
            <h2 className="font-semibold text-foreground mb-3">Ações Rápidas</h2>
            <div className="space-y-2">
              <Link href="/foto-ia/pedidos" className="flex items-center gap-2 p-2.5 rounded-lg hover:bg-surface-2 transition-colors text-sm text-foreground">
                <Clock size={14} className="text-muted-foreground" />
                Ver todos os pedidos
              </Link>
              <Link href="/foto-ia/configuracoes" className="flex items-center gap-2 p-2.5 rounded-lg hover:bg-surface-2 transition-colors text-sm text-foreground">
                <Sparkles size={14} className="text-muted-foreground" />
                Configurar preços e prompts
              </Link>
              <Link href="/crm" className="flex items-center gap-2 p-2.5 rounded-lg hover:bg-surface-2 transition-colors text-sm text-foreground">
                <TrendingUp size={14} className="text-muted-foreground" />
                Pipeline FotoIA no CRM
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Relatório da Semana */}
      {relatorio && (
        <div className="card-agency p-5">
          <div className="flex items-center gap-2 mb-4">
            <BarChart2 size={16} className="text-gold-400" />
            <h2 className="font-semibold text-foreground">Relatório da Semana</h2>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
            <div className="text-center">
              <p className="text-2xl font-bold text-foreground">{relatorio.pedidosCriados}</p>
              <p className="text-xs text-muted-foreground mt-0.5">Pedidos criados</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-green-400">{relatorio.pedidosConcluidos}</p>
              <p className="text-xs text-muted-foreground mt-0.5">Concluídos</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-gold-400">
                {relatorio.receita.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 0 })}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">Receita</p>
            </div>
            <div className="text-center">
              <div className="flex items-center justify-center gap-1">
                <p className="text-2xl font-bold text-foreground">{relatorio.taxaConversao}%</p>
                {relatorio.taxaConversao >= 30
                  ? <ArrowUpRight size={16} className="text-green-400" />
                  : <ArrowDownRight size={16} className="text-red-400" />
                }
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">Conversão</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-foreground">
                {relatorio.tempoMedioHoras > 0 ? `${relatorio.tempoMedioHoras}h` : '—'}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">Tempo médio</p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
