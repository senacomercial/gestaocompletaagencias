'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { Camera, Search, ArrowRight, Loader2, SlidersHorizontal, Plus, X } from 'lucide-react'

interface Pedido {
  id: string
  status: string
  tipoFoto: string
  valorCobrado: number | null
  rodadasRevisao: number
  criadoEm: string
  entregueEm: string | null
  lead: { id: string; nome: string; empresa: string | null; telefone: string | null }
  imagens: Array<{ url: string }>
  _count: { imagens: number }
}

interface Lead {
  id: string
  nome: string
  empresa: string | null
  telefone: string | null
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
  NOVO_LEAD: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  EM_QUALIFICACAO: 'bg-violet-500/10 text-violet-400 border-violet-500/20',
  PROPOSTA_ENVIADA: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
  FOLLOWUP_1: 'bg-orange-500/10 text-orange-400 border-orange-500/20',
  FOLLOWUP_2: 'bg-red-500/10 text-red-400 border-red-500/20',
  AGUARDANDO_PAGAMENTO: 'bg-gold-400/10 text-gold-400 border-gold-400/20',
  PAGAMENTO_CONFIRMADO: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  EM_PRODUCAO: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20',
  AGUARDANDO_APROVACAO: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
  EM_REVISAO: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
  ENTREGUE: 'bg-green-500/10 text-green-400 border-green-500/20',
  CANCELADO: 'bg-surface-3 text-muted-foreground border-surface-4',
  PERDIDO: 'bg-red-500/10 text-red-400 border-red-500/20',
}

const TIPOS_FOTO = [
  { value: 'RETRATO_PROFISSIONAL', label: 'Retrato Profissional' },
  { value: 'FOTO_PRODUTO', label: 'Foto de Produto' },
  { value: 'FOTO_CORPORATIVA', label: 'Foto Corporativa' },
  { value: 'BANNER_REDES_SOCIAIS', label: 'Banner Redes Sociais' },
  { value: 'FOTO_PERFIL', label: 'Foto de Perfil' },
  { value: 'CUSTOM', label: 'Personalizado' },
]

const ALL_STATUSES = Object.keys(STATUS_LABELS)

function NovoPedidoModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [leads, setLeads] = useState<Lead[]>([])
  const [leadId, setLeadId] = useState('')
  const [tipoFoto, setTipoFoto] = useState('RETRATO_PROFISSIONAL')
  const [descricao, setDescricao] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    fetch('/api/leads?limit=100')
      .then(r => r.json())
      .then(d => setLeads(d.leads ?? []))
      .catch(() => {})
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!leadId) { setError('Selecione um lead'); return }
    setSaving(true)
    setError('')
    const res = await fetch('/api/foto-ia/pedidos', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ leadId, tipoFoto, descricao }),
    })
    if (res.ok) {
      onCreated()
      onClose()
    } else {
      const d = await res.json()
      setError(d.error ?? 'Erro ao criar pedido')
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
      <div className="card-agency w-full max-w-md p-6 space-y-5">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-foreground">Novo Pedido FotoIA</h2>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-surface-2 transition-colors">
            <X size={16} className="text-muted-foreground" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-xs text-muted-foreground block mb-1.5">Lead / Cliente *</label>
            <select
              value={leadId}
              onChange={e => setLeadId(e.target.value)}
              className="input-agency w-full py-2"
              required
            >
              <option value="">Selecione um lead...</option>
              {leads.map(l => (
                <option key={l.id} value={l.id}>
                  {l.nome}{l.empresa ? ` — ${l.empresa}` : ''}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-xs text-muted-foreground block mb-1.5">Tipo de Foto *</label>
            <select
              value={tipoFoto}
              onChange={e => setTipoFoto(e.target.value)}
              className="input-agency w-full py-2"
            >
              {TIPOS_FOTO.map(t => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-xs text-muted-foreground block mb-1.5">Briefing / Descrição</label>
            <textarea
              value={descricao}
              onChange={e => setDescricao(e.target.value)}
              placeholder="Detalhes sobre o estilo, preferências, uso final das fotos..."
              rows={3}
              className="input-agency w-full py-2 resize-none"
            />
          </div>

          {error && (
            <p className="text-xs text-red-400">{error}</p>
          )}

          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose} className="flex-1 btn-ghost text-sm">
              Cancelar
            </button>
            <button type="submit" disabled={saving} className="flex-1 btn-gold text-sm flex items-center justify-center gap-2">
              {saving ? <Loader2 size={14} className="animate-spin" /> : <Camera size={14} />}
              {saving ? 'Criando...' : 'Criar Pedido'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default function PedidosPage() {
  const [pedidos, setPedidos] = useState<Pedido[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [showModal, setShowModal] = useState(false)

  const fetchPedidos = useCallback(async () => {
    setLoading(true)
    const params = new URLSearchParams({ limit: '50' })
    if (statusFilter) params.set('status', statusFilter)
    const res = await fetch(`/api/foto-ia/pedidos?${params}`)
    const data = await res.json()
    setPedidos(data.pedidos ?? [])
    setLoading(false)
  }, [statusFilter])

  useEffect(() => {
    fetchPedidos()
  }, [fetchPedidos])

  const filtered = pedidos.filter(p =>
    search
      ? p.lead.nome.toLowerCase().includes(search.toLowerCase()) ||
        (p.lead.empresa ?? '').toLowerCase().includes(search.toLowerCase())
      : true
  )

  return (
    <div className="space-y-5 animate-fade-in">
      {showModal && (
        <NovoPedidoModal
          onClose={() => setShowModal(false)}
          onCreated={fetchPedidos}
        />
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-foreground">Pedidos FotoIA</h1>
          <p className="text-sm text-muted-foreground">
            {pedidos.length} pedido{pedidos.length !== 1 ? 's' : ''} encontrado{pedidos.length !== 1 ? 's' : ''}
          </p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="btn-gold text-sm flex items-center gap-1.5"
        >
          <Plus size={15} />
          Novo Pedido
        </button>
      </div>

      {/* Filtros */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="Buscar por cliente..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="input-agency pl-9 py-2"
          />
        </div>
        <div className="flex items-center gap-2">
          <SlidersHorizontal size={15} className="text-muted-foreground" />
          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            className="input-agency py-2 w-52"
          >
            <option value="">Todos os status</option>
            {ALL_STATUSES.map(s => (
              <option key={s} value={s}>{STATUS_LABELS[s]}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Lista */}
      {loading ? (
        <div className="flex items-center justify-center h-40">
          <Loader2 size={28} className="animate-spin text-gold-400" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="card-agency p-12 flex flex-col items-center text-muted-foreground">
          <Camera size={36} className="mb-3 opacity-40" />
          <p className="font-medium">Nenhum pedido encontrado</p>
          <p className="text-xs mt-1">
            {pedidos.length === 0
              ? 'Clique em "Novo Pedido" para começar'
              : 'Tente ajustar os filtros'}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map(pedido => (
            <Link
              key={pedido.id}
              href={`/foto-ia/pedidos/${pedido.id}`}
              className="card-agency p-4 flex items-center gap-4 hover:border-surface-4 transition-colors group"
            >
              <div className="p-2.5 rounded-lg bg-violet-500/10">
                <Camera size={18} className="text-violet-400" />
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="font-medium text-foreground text-sm truncate">{pedido.lead.nome}</p>
                  {pedido.lead.empresa && (
                    <span className="text-xs text-muted-foreground">• {pedido.lead.empresa}</span>
                  )}
                </div>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-xs text-muted-foreground">
                    {TIPOS_FOTO.find(t => t.value === pedido.tipoFoto)?.label ?? pedido.tipoFoto}
                  </span>
                  <span className="text-muted-foreground/30">•</span>
                  <span className="text-xs text-muted-foreground">
                    {pedido._count.imagens} foto{pedido._count.imagens !== 1 ? 's' : ''}
                  </span>
                  {pedido.rodadasRevisao > 0 && (
                    <>
                      <span className="text-muted-foreground/30">•</span>
                      <span className="text-xs text-amber-400">
                        {pedido.rodadasRevisao} revisão{pedido.rodadasRevisao !== 1 ? 'ões' : ''}
                      </span>
                    </>
                  )}
                </div>
              </div>

              {pedido.valorCobrado && (
                <div className="text-right">
                  <p className="text-sm font-semibold text-gold-400">
                    R$ {Number(pedido.valorCobrado).toLocaleString('pt-BR')}
                  </p>
                </div>
              )}

              <span className={`text-xs px-2.5 py-1 rounded-full font-medium border ${STATUS_COLORS[pedido.status] ?? 'bg-surface-3 text-muted-foreground border-surface-4'}`}>
                {STATUS_LABELS[pedido.status] ?? pedido.status}
              </span>

              <div className="text-right text-xs text-muted-foreground w-20">
                {new Date(pedido.criadoEm).toLocaleDateString('pt-BR')}
              </div>

              <ArrowRight size={14} className="text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
