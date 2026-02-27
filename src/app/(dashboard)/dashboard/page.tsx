import { getSession } from '@/lib/auth'
import { redirect } from 'next/navigation'
import {
  DollarSign, TrendingUp, Users, ClipboardList,
  Plus, Kanban, FolderKanban, ArrowRight, Bot,
  MessageCircle, CheckCircle2,
} from 'lucide-react'
import Link from 'next/link'
import { getKpis, getAtividadeRecente } from '@/lib/services/dashboard'
import { KpiCard } from '@/components/dashboard/KpiCard'
import { RecentActivity } from '@/components/dashboard/RecentActivity'

export const metadata = { title: 'Dashboard' }
export const revalidate = 60

// ─── Saudação dinâmica ─────────────────────────────────────────────────────

function getGreeting(name: string) {
  const hour = new Date().getHours()
  const first = name.split(' ')[0]
  if (hour < 12) return `Bom dia, ${first}!`
  if (hour < 18) return `Boa tarde, ${first}!`
  return `Boa noite, ${first}!`
}

// ─── Ações rápidas ─────────────────────────────────────────────────────────

const quickActions = [
  { href: '/crm',        label: 'Pipeline CRM',    icon: Kanban,        color: 'text-status-info',    bg: 'bg-status-info/10'    },
  { href: '/projetos',   label: 'Projetos',         icon: FolderKanban,  color: 'text-gold-400',       bg: 'bg-gold-400/10'       },
  { href: '/whatsapp',   label: 'WhatsApp',         icon: MessageCircle, color: 'text-status-success', bg: 'bg-status-success/10' },
  { href: '/squad',      label: 'Squad IA',         icon: Bot,           color: 'text-bronze-400',     bg: 'bg-bronze-400/10'     },
]

// ─── Módulos ativas ─────────────────────────────────────────────────────────

const modulos = [
  { label: 'CRM & Pipeline',   href: '/crm'        },
  { label: 'Projetos & Tasks', href: '/projetos'   },
  { label: 'WhatsApp',         href: '/whatsapp'   },
  { label: 'Financeiro',       href: '/financeiro' },
  { label: 'Squad IA',         href: '/squad'      },
]

// ─── Page ──────────────────────────────────────────────────────────────────

export default async function DashboardPage() {
  const session = await getSession()
  if (!session?.user) redirect('/login')

  const [kpis, atividade] = await Promise.all([
    getKpis(session.user.organizacaoId, session.user.id),
    getAtividadeRecente(session.user.organizacaoId),
  ])

  const today = new Date()
  const dayName  = today.toLocaleDateString('pt-BR', { weekday: 'long' })
  const dateStr  = today.toLocaleDateString('pt-BR', { day: 'numeric', month: 'long' })

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6 animate-fade-in">

      {/* ── Header de saudação ── */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black bg-gradient-to-r from-gold-400 to-bronze-400 bg-clip-text text-transparent">
            {getGreeting(session.user.name || 'Usuário')}
          </h1>
          <p className="text-muted-foreground text-sm mt-1 capitalize">
            {dayName}, {dateStr} · {session.user.organizacaoNome}
          </p>
        </div>
        <Link
          href="/crm"
          className="hidden sm:flex items-center gap-2 h-9 px-4 bg-gradient-to-r from-gold-400 to-bronze-400 text-surface-base rounded-lg text-sm font-bold hover:opacity-90 active:scale-95 transition-all flex-shrink-0"
        >
          <Plus className="w-4 h-4" />
          Novo Lead
        </Link>
      </div>

      {/* ── KPIs ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          title="VGV Total"
          value={kpis.vgvTotal}
          icon={DollarSign}
          format="currency"
          subtitle="Vendas realizadas"
          iconColor="text-gold-400"
        />
        <KpiCard
          title="MRR"
          value={kpis.mrr}
          icon={TrendingUp}
          format="currency"
          subtitle="Receita recorrente"
          iconColor="text-status-success"
        />
        <KpiCard
          title="Leads Ativos"
          value={kpis.leadsAtivos}
          icon={Users}
          subtitle={`+${kpis.leadsNovasSemana} esta semana`}
          iconColor="text-status-info"
        />
        <KpiCard
          title="Tarefas Hoje"
          value={kpis.tarefasHoje}
          icon={ClipboardList}
          subtitle="Pendentes para hoje"
          iconColor="text-status-warning"
        />
      </div>

      {/* ── Ações rápidas ── */}
      <div>
        <p className="section-label mb-3">Acesso rápido</p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {quickActions.map(({ href, label, icon: Icon, color, bg }) => (
            <Link
              key={label}
              href={href}
              className="flex items-center gap-3 p-4 bg-surface-1 border border-surface-3 rounded-lg hover:border-gold-400/30 hover:bg-surface-2/50 transition-all group"
            >
              <div className={`p-2 rounded-lg flex-shrink-0 ${bg} transition-transform group-hover:scale-105`}>
                <Icon className={`w-4 h-4 ${color}`} />
              </div>
              <div className="flex-1 min-w-0">
                <span className="text-[13px] font-medium text-foreground group-hover:text-gold-400 transition-colors truncate block">
                  {label}
                </span>
              </div>
              <ArrowRight className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0 opacity-0 group-hover:opacity-100 -translate-x-1 group-hover:translate-x-0 transition-all" />
            </Link>
          ))}
        </div>
      </div>

      {/* ── Atividade + Painel lateral ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Atividade recente — ocupa 2/3 */}
        <div className="lg:col-span-2 min-h-[360px]">
          <RecentActivity atividades={atividade} />
        </div>

        {/* Coluna lateral */}
        <div className="space-y-4">

          {/* Squad IA status */}
          <div className="card-agency p-4">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-bronze-400/10 flex items-center justify-center">
                  <Bot className="w-3.5 h-3.5 text-bronze-400" />
                </div>
                <h3 className="text-sm font-semibold text-foreground">Squad IA</h3>
              </div>
              <Link href="/squad" className="text-xs text-gold-400 hover:text-gold-300 transition-colors flex items-center gap-1">
                Ver squad
                <ArrowRight className="w-3 h-3" />
              </Link>
            </div>

            <div className="space-y-3">
              <div className="flex items-center gap-2.5 p-3 rounded-lg bg-surface-2 border border-surface-3">
                <span className="w-2 h-2 rounded-full bg-emerald-400 flex-shrink-0 animate-pulse" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-foreground">Agentes prontos</p>
                  <p className="text-[11px] text-muted-foreground">Squad operacional</p>
                </div>
              </div>

              <Link
                href="/squad"
                className="flex items-center justify-center gap-2 w-full h-8 rounded-lg border border-surface-3 text-xs text-muted-foreground hover:border-gold-400/40 hover:text-gold-400 transition-all"
              >
                <Plus className="w-3.5 h-3.5" />
                Nova execução
              </Link>
            </div>
          </div>

          {/* Módulos ativos */}
          <div className="card-agency p-4">
            <h3 className="text-sm font-semibold text-foreground mb-3">Módulos ativos</h3>
            <div className="space-y-2">
              {modulos.map(({ label, href }) => (
                <Link
                  key={label}
                  href={href}
                  className="flex items-center justify-between py-1.5 group"
                >
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
                    <span className="text-xs text-muted-foreground group-hover:text-foreground transition-colors">
                      {label}
                    </span>
                  </div>
                  <span className="text-[10px] px-1.5 py-0.5 rounded-full font-medium bg-emerald-500/10 text-emerald-400">
                    Ativo
                  </span>
                </Link>
              ))}
            </div>
          </div>

        </div>
      </div>
    </div>
  )
}
