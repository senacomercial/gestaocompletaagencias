'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import {
  ArrowLeft, Camera, CheckCircle2, Clock, AlertCircle, ImageIcon,
  RefreshCw, ChevronRight, Loader2, ExternalLink, User, Calendar,
  DollarSign, Sparkles,
} from 'lucide-react'

interface Imagem {
  id: string
  url: string
  urlPublica: string | null
  tipo: string
  rodada: number
  aprovada: boolean
  criadoEm: string
}

interface Execucao {
  id: string
  etapa: string
  status: string
  saida: unknown
  erro: string | null
  executadoEm: string
  duracaoMs: number | null
}

interface Pedido {
  id: string
  status: string
  tipoFoto: string
  descricao: string | null
  valorCobrado: number | null
  linkPagamento: string | null
  rodadasRevisao: number
  criadoEm: string
  aprovadoEm: string | null
  entregueEm: string | null
  lead: { id: string; nome: string; telefone: string; empresa: string | null }
  imagens: Imagem[]
  execucoes: Execucao[]
}

const STATUS_LABELS: Record<string, string> = {
  NOVO_LEAD: 'Novo Lead',
  EM_QUALIFICACAO: 'Em Qualificação',
  PROPOSTA_ENVIADA: 'Proposta Enviada',
  FOLLOWUP_1: 'Follow-up 1',
  FOLLOWUP_2: 'Follow-up 2',
  AGUARDANDO_PAGAMENTO: 'Aguardando Pagamento',
  PAGAMENTO_CONFIRMADO: 'Pagamento Confirmado',
  EM_PRODUCAO: 'Em Produção',
  AGUARDANDO_APROVACAO: 'Aguardando Aprovação',
  EM_REVISAO: 'Em Revisão',
  ENTREGUE: 'Entregue',
  CANCELADO: 'Cancelado',
  PERDIDO: 'Perdido',
}

const STATUS_COLORS: Record<string, string> = {
  NOVO_LEAD: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  EM_QUALIFICACAO: 'bg-violet-500/10 text-violet-400 border-violet-500/20',
  PROPOSTA_ENVIADA: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
  FOLLOWUP_1: 'bg-orange-500/10 text-orange-400 border-orange-500/20',
  FOLLOWUP_2: 'bg-red-500/10 text-red-400 border-red-500/20',
  AGUARDANDO_PAGAMENTO: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
  PAGAMENTO_CONFIRMADO: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  EM_PRODUCAO: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20',
  AGUARDANDO_APROVACAO: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
  EM_REVISAO: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
  ENTREGUE: 'bg-green-500/10 text-green-400 border-green-500/20',
  CANCELADO: 'bg-surface-3 text-muted-foreground border-surface-3',
  PERDIDO: 'bg-red-500/10 text-red-400 border-red-500/20',
}

const PIPELINE_STEPS = [
  'NOVO_LEAD', 'EM_QUALIFICACAO', 'PROPOSTA_ENVIADA', 'AGUARDANDO_PAGAMENTO',
  'PAGAMENTO_CONFIRMADO', 'EM_PRODUCAO', 'AGUARDANDO_APROVACAO', 'ENTREGUE',
]

export default function PedidoDetalhePage() {
  const params = useParams()
  const pedidoId = params.id as string
  const [pedido, setPedido] = useState<Pedido | null>(null)
  const [loading, setLoading] = useState(true)
  const [acionando, setAcionando] = useState(false)

  useEffect(() => {
    if (!pedidoId) return
    fetch(`/api/foto-ia/pedidos/${pedidoId}`)
      .then(r => r.json())
      .then(d => { setPedido(d); setLoading(false) })
      .catch(() => setLoading(false))
  }, [pedidoId])

  async function acionarGeracao() {
    if (!pedido) return
    setAcionando(true)
    await fetch('/api/foto-ia/gerar', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pedidoId: pedido.id }),
    })
    // Recarregar dados
    const r = await fetch(`/api/foto-ia/pedidos/${pedidoId}`)
    const d = await r.json()
    setPedido(d)
    setAcionando(false)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 size={32} className="animate-spin text-gold-400" />
      </div>
    )
  }

  if (!pedido) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4">
        <AlertCircle size={32} className="text-red-400" />
        <p className="text-muted-foreground">Pedido não encontrado</p>
        <Link href="/foto-ia/pedidos" className="btn-gold text-sm">Voltar</Link>
      </div>
    )
  }

  const stepIdx = PIPELINE_STEPS.indexOf(pedido.status)

  return (
    <div className="space-y-6 animate-fade-in max-w-5xl">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link href="/foto-ia/pedidos" className="p-1.5 rounded-lg hover:bg-surface-2 transition-colors">
          <ArrowLeft size={18} className="text-muted-foreground" />
        </Link>
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-violet-500/10">
            <Camera size={16} className="text-violet-400" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-foreground">Pedido — {pedido.lead.nome}</h1>
            <p className="text-xs text-muted-foreground">{pedido.tipoFoto.replace(/_/g, ' ')}</p>
          </div>
        </div>
        <div className="ml-auto">
          <span className={`text-xs px-2.5 py-1 rounded-full border font-medium ${STATUS_COLORS[pedido.status] ?? 'bg-surface-3 text-muted-foreground'}`}>
            {STATUS_LABELS[pedido.status] ?? pedido.status}
          </span>
        </div>
      </div>

      {/* Pipeline Progress */}
      <div className="card-agency p-5">
        <h2 className="text-sm font-semibold text-foreground mb-4">Pipeline</h2>
        <div className="flex items-center gap-1 overflow-x-auto pb-1">
          {PIPELINE_STEPS.map((step, i) => (
            <div key={step} className="flex items-center gap-1 shrink-0">
              <div className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium
                ${i < stepIdx ? 'bg-green-500/10 text-green-400' :
                  i === stepIdx ? 'bg-gold-400/10 text-gold-400 ring-1 ring-gold-400/30' :
                  'bg-surface-2 text-muted-foreground'}`}
              >
                {i < stepIdx && <CheckCircle2 size={10} />}
                {i === stepIdx && <Sparkles size={10} />}
                {STATUS_LABELS[step]}
              </div>
              {i < PIPELINE_STEPS.length - 1 && (
                <ChevronRight size={12} className="text-muted-foreground" />
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Info do pedido */}
        <div className="space-y-4">
          <div className="card-agency p-5">
            <h2 className="text-sm font-semibold text-foreground mb-4">Detalhes</h2>
            <div className="space-y-3 text-sm">
              <div className="flex items-start gap-2">
                <User size={14} className="text-muted-foreground mt-0.5" />
                <div>
                  <p className="text-foreground font-medium">{pedido.lead.nome}</p>
                  {pedido.lead.empresa && <p className="text-muted-foreground">{pedido.lead.empresa}</p>}
                  <p className="text-muted-foreground text-xs">{pedido.lead.telefone}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Calendar size={14} className="text-muted-foreground" />
                <span className="text-muted-foreground">
                  {new Date(pedido.criadoEm).toLocaleDateString('pt-BR')}
                </span>
              </div>
              {pedido.valorCobrado && (
                <div className="flex items-center gap-2">
                  <DollarSign size={14} className="text-gold-400" />
                  <span className="text-gold-400 font-semibold">
                    R$ {Number(pedido.valorCobrado).toLocaleString('pt-BR')}
                  </span>
                </div>
              )}
              {pedido.rodadasRevisao > 0 && (
                <div className="flex items-center gap-2">
                  <RefreshCw size={14} className="text-amber-400" />
                  <span className="text-amber-400">{pedido.rodadasRevisao} revisão(ões)</span>
                </div>
              )}
            </div>
          </div>

          {pedido.linkPagamento && (
            <div className="card-agency p-4">
              <a
                href={pedido.linkPagamento}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-sm text-gold-400 hover:text-gold-300"
              >
                <ExternalLink size={14} />
                Ver link de pagamento
              </a>
            </div>
          )}

          {/* Ações manuais */}
          {(pedido.status === 'PAGAMENTO_CONFIRMADO' || pedido.status === 'EM_REVISAO') && (
            <button
              onClick={acionarGeracao}
              disabled={acionando}
              className="btn-gold w-full text-sm flex items-center justify-center gap-2"
            >
              {acionando ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
              {acionando ? 'Disparando...' : 'Gerar Imagens'}
            </button>
          )}
        </div>

        {/* Imagens + Execuções */}
        <div className="lg:col-span-2 space-y-4">
          {/* Galeria de imagens */}
          <div className="card-agency p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold text-foreground">
                Imagens Geradas ({pedido.imagens.length})
              </h2>
            </div>
            {pedido.imagens.length === 0 ? (
              <div className="flex flex-col items-center py-8 text-muted-foreground">
                <ImageIcon size={28} className="mb-2 opacity-40" />
                <p className="text-sm">Nenhuma imagem gerada ainda</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {pedido.imagens.map(img => (
                  <div key={img.id} className="relative group rounded-lg overflow-hidden bg-surface-2 aspect-square">
                    <img
                      src={img.urlPublica ?? img.url}
                      alt={`Imagem ${img.tipo} rodada ${img.rodada}`}
                      className="w-full h-full object-cover"
                      onError={(e) => { (e.target as HTMLImageElement).src = '/placeholder-image.png' }}
                    />
                    {img.aprovada && (
                      <div className="absolute top-1.5 right-1.5 bg-green-500 rounded-full p-0.5">
                        <CheckCircle2 size={10} className="text-white" />
                      </div>
                    )}
                    <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <p className="text-xs text-white">Rodada {img.rodada}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Timeline de execuções */}
          <div className="card-agency p-5">
            <h2 className="text-sm font-semibold text-foreground mb-4">
              Timeline ({pedido.execucoes.length} eventos)
            </h2>
            {pedido.execucoes.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">Nenhuma execução registrada</p>
            ) : (
              <div className="space-y-3">
                {[...pedido.execucoes].reverse().map(exec => (
                  <div key={exec.id} className="flex items-start gap-3">
                    <div className={`mt-0.5 w-2 h-2 rounded-full shrink-0 ${
                      exec.status === 'concluido' ? 'bg-green-400' :
                      exec.status === 'erro' ? 'bg-red-400' :
                      'bg-amber-400'
                    }`} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-sm font-medium text-foreground truncate">{exec.etapa}</p>
                        <span className={`text-xs shrink-0 ${
                          exec.status === 'concluido' ? 'text-green-400' :
                          exec.status === 'erro' ? 'text-red-400' :
                          'text-amber-400'
                        }`}>
                          {exec.status}
                        </span>
                      </div>
                      {exec.erro && (
                        <p className="text-xs text-red-400 mt-0.5 truncate">{exec.erro}</p>
                      )}
                      <p className="text-xs text-muted-foreground mt-0.5">
                        <Clock size={9} className="inline mr-1" />
                        {new Date(exec.executadoEm).toLocaleString('pt-BR')}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
