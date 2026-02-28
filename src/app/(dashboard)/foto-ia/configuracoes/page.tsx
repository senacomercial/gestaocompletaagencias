'use client'

import { useState, useEffect, useRef } from 'react'
import {
  Settings, DollarSign, Sparkles, MessageSquare, Plug,
  Save, CheckCircle, XCircle, Loader2, RefreshCw, Edit2, Check, X,
} from 'lucide-react'

// ── Types ──────────────────────────────────────────────────────────────────

interface PacoteConfig {
  preco: number
  qtdImagens: number
  revisoes: number
  ativo: boolean
}

interface FotoIAConfig {
  precos: Record<string, PacoteConfig>
  prompts: Record<string, { base?: string; negativo?: string; modelo?: string }>
  templates: Record<string, string>
  replicateModel?: string
  gatewayProvider?: string
  storageProvider?: string
}

type TabKey = 'precos' | 'prompts' | 'templates' | 'integracoes'

const TIPOS_FOTO = ['RETRATO_PROFISSIONAL', 'FOTO_PRODUTO', 'FOTO_CORPORATIVA', 'BANNER_REDES_SOCIAIS', 'FOTO_PERFIL', 'CUSTOM']
const TIPOS_FOTO_LABEL: Record<string, string> = {
  RETRATO_PROFISSIONAL: 'Retrato Profissional',
  FOTO_PRODUTO: 'Foto de Produto',
  FOTO_CORPORATIVA: 'Foto Corporativa',
  BANNER_REDES_SOCIAIS: 'Banner Redes Sociais',
  FOTO_PERFIL: 'Foto de Perfil',
  CUSTOM: 'Personalizado',
}

const TEMPLATE_LABELS: Record<string, string> = {
  saudacao:    'Saudação + Menu de Pacotes',
  cobranca:    'Cobrança PIX',
  coletarTema: 'Solicitar Tema das Fotos',
  coletarFoto: 'Solicitar Foto do Rosto',
  emProducao:  'Em Produção (status)',
  entrega:     'Entrega Final',
  followup1:   'Follow-up 1 (24h)',
  followup2:   'Follow-up 2 (48h)',
}

const TEMPLATE_VARS: Record<string, string[]> = {
  saudacao:    ['{nome}', '{empresa}'],
  cobranca:    ['{nome}', '{pacote}', '{qtdFotos}', '{revisoes}', '{valor}', '{tipoPix}', '{chavePix}', '{nomeBeneficiario}'],
  coletarTema: ['{nome}'],
  coletarFoto: ['{tema}'],
  emProducao:  ['{nome}'],
  entrega:     [],
  followup1:   ['{nome}'],
  followup2:   ['{nome}'],
}

const REPLICATE_MODELS = [
  { value: 'tencentarc/photomaker-style:ddfc2b08d209f9fa8c1eca692712918bd449f695d786de39a1d4f0c4cbed1433', label: 'PhotoMaker Style (Recomendado)' },
  { value: 'stability-ai/sdxl:39ed52f2319f9c5b683de680a3c9c3e73a660a7bed60e13f9f8eb',               label: 'Stable Diffusion XL' },
  { value: 'black-forest-labs/flux-schnell',                                                         label: 'FLUX Schnell (Rápido)' },
]

// ── Componente Principal ───────────────────────────────────────────────────

export default function FotoIAConfiguracoes() {
  const [tab, setTab]           = useState<TabKey>('precos')
  const [config, setConfig]     = useState<FotoIAConfig | null>(null)
  const [loading, setLoading]   = useState(true)
  const [saving, setSaving]     = useState(false)
  const [saved, setSaved]       = useState(false)
  const [error, setError]       = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/foto-ia/configuracoes')
      .then(r => r.json())
      .then(d => { setConfig(d); setLoading(false) })
      .catch(() => { setError('Erro ao carregar configurações'); setLoading(false) })
  }, [])

  async function salvarConfig(partial: Partial<FotoIAConfig>) {
    setSaving(true)
    setError(null)
    try {
      const res = await fetch('/api/foto-ia/configuracoes', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(partial),
      })
      if (!res.ok) throw new Error('Erro ao salvar')
      const updated = await res.json()
      setConfig(updated)
      setSaved(true)
      setTimeout(() => setSaved(false), 2500)
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setSaving(false)
    }
  }

  const TABS: { key: TabKey; label: string; icon: React.ReactNode }[] = [
    { key: 'precos',       label: 'Preços',            icon: <DollarSign size={15} /> },
    { key: 'prompts',      label: 'Prompts IA',        icon: <Sparkles size={15} /> },
    { key: 'templates',    label: 'Templates WhatsApp', icon: <MessageSquare size={15} /> },
    { key: 'integracoes',  label: 'Integrações',       icon: <Plug size={15} /> },
  ]

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <Loader2 size={24} className="animate-spin text-muted-foreground" />
    </div>
  )

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-surface-2 border border-surface-3">
            <Settings size={20} className="text-muted-foreground" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-foreground">Configurações FotoIA</h1>
            <p className="text-sm text-muted-foreground">Preços, prompts de IA e templates de mensagem</p>
          </div>
        </div>

        {saved && (
          <div className="flex items-center gap-1.5 text-sm text-green-400">
            <CheckCircle size={16} />
            Salvo!
          </div>
        )}
        {error && (
          <div className="flex items-center gap-1.5 text-sm text-red-400">
            <XCircle size={16} />
            {error}
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 bg-surface-2 rounded-lg border border-surface-3 w-fit">
        {TABS.map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
              tab === t.key
                ? 'bg-surface-1 text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            {t.icon}
            {t.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {config && tab === 'precos'      && <TabPrecos      config={config} onSave={salvarConfig} saving={saving} />}
      {config && tab === 'prompts'     && <TabPrompts     config={config} onSave={salvarConfig} saving={saving} />}
      {config && tab === 'templates'   && <TabTemplates   config={config} onSave={salvarConfig} saving={saving} />}
      {config && tab === 'integracoes' && <TabIntegracoes config={config} onSave={salvarConfig} saving={saving} />}
    </div>
  )
}

// ── Tab Preços ─────────────────────────────────────────────────────────────

function TabPrecos({ config, onSave, saving }: {
  config: FotoIAConfig
  onSave: (p: Partial<FotoIAConfig>) => Promise<void>
  saving: boolean
}) {
  const [precos, setPrecos] = useState<Record<string, PacoteConfig>>(
    config.precos ?? {
      BASICO:       { preco: 27, qtdImagens: 5,  revisoes: 1,  ativo: true },
      PROFISSIONAL: { preco: 47, qtdImagens: 10, revisoes: 4,  ativo: true },
      PREMIUM:      { preco: 97, qtdImagens: 30, revisoes: 10, ativo: true },
    },
  )
  const [editing, setEditing] = useState<string | null>(null)
  const [draft, setDraft]     = useState<Partial<PacoteConfig>>({})

  const PACOTE_LABELS: Record<string, string> = {
    BASICO: 'Básico', PROFISSIONAL: 'Profissional ⭐', PREMIUM: 'Premium',
  }

  function startEdit(key: string) {
    setEditing(key)
    setDraft({ ...precos[key] })
  }
  function cancelEdit() { setEditing(null); setDraft({}) }
  function confirmEdit(key: string) {
    setPrecos(p => ({ ...p, [key]: { ...p[key], ...draft } }))
    setEditing(null)
  }

  return (
    <div className="space-y-4">
      <div className="card-agency overflow-hidden">
        <div className="p-4 border-b border-surface-3">
          <h2 className="font-semibold text-foreground text-sm">Tabela de Preços</h2>
          <p className="text-xs text-muted-foreground mt-0.5">Clique em Editar para alterar valores</p>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-xs text-muted-foreground border-b border-surface-3">
              <th className="text-left p-3 font-medium">Pacote</th>
              <th className="text-right p-3 font-medium">Preço (R$)</th>
              <th className="text-right p-3 font-medium">Qtd Fotos</th>
              <th className="text-right p-3 font-medium">Revisões</th>
              <th className="text-center p-3 font-medium">Ativo</th>
              <th className="p-3" />
            </tr>
          </thead>
          <tbody>
            {Object.entries(precos).map(([key, val]) => (
              <tr key={key} className="border-b border-surface-3 last:border-0 hover:bg-surface-2/50">
                {editing === key ? (
                  <>
                    <td className="p-3 font-medium text-foreground">{PACOTE_LABELS[key] ?? key}</td>
                    <td className="p-3 text-right">
                      <input
                        type="number" min={1}
                        value={draft.preco ?? val.preco}
                        onChange={e => setDraft(d => ({ ...d, preco: Number(e.target.value) }))}
                        className="w-20 text-right bg-surface-2 border border-violet-500/50 rounded px-2 py-1 text-sm text-foreground"
                      />
                    </td>
                    <td className="p-3 text-right">
                      <input
                        type="number" min={1}
                        value={draft.qtdImagens ?? val.qtdImagens}
                        onChange={e => setDraft(d => ({ ...d, qtdImagens: Number(e.target.value) }))}
                        className="w-20 text-right bg-surface-2 border border-violet-500/50 rounded px-2 py-1 text-sm text-foreground"
                      />
                    </td>
                    <td className="p-3 text-right">
                      <input
                        type="number" min={0}
                        value={draft.revisoes ?? val.revisoes}
                        onChange={e => setDraft(d => ({ ...d, revisoes: Number(e.target.value) }))}
                        className="w-16 text-right bg-surface-2 border border-violet-500/50 rounded px-2 py-1 text-sm text-foreground"
                      />
                    </td>
                    <td className="p-3 text-center">
                      <input type="checkbox"
                        checked={draft.ativo ?? val.ativo}
                        onChange={e => setDraft(d => ({ ...d, ativo: e.target.checked }))}
                        className="accent-violet-500"
                      />
                    </td>
                    <td className="p-3">
                      <div className="flex gap-1 justify-end">
                        <button onClick={() => confirmEdit(key)} className="p-1 rounded hover:bg-green-500/20 text-green-400"><Check size={14} /></button>
                        <button onClick={cancelEdit} className="p-1 rounded hover:bg-red-500/20 text-red-400"><X size={14} /></button>
                      </div>
                    </td>
                  </>
                ) : (
                  <>
                    <td className="p-3 font-medium text-foreground">{PACOTE_LABELS[key] ?? key}</td>
                    <td className="p-3 text-right text-gold-400 font-semibold">R$ {val.preco.toFixed(2).replace('.', ',')}</td>
                    <td className="p-3 text-right text-muted-foreground">{val.qtdImagens}</td>
                    <td className="p-3 text-right text-muted-foreground">{val.revisoes}</td>
                    <td className="p-3 text-center">
                      <span className={`inline-block w-2 h-2 rounded-full ${val.ativo ? 'bg-green-400' : 'bg-surface-3'}`} />
                    </td>
                    <td className="p-3 text-right">
                      <button onClick={() => startEdit(key)} className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground px-2 py-1 rounded hover:bg-surface-2">
                        <Edit2 size={12} /> Editar
                      </button>
                    </td>
                  </>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <button
        onClick={() => onSave({ precos })}
        disabled={saving}
        className="flex items-center gap-2 px-4 py-2 bg-violet-600 hover:bg-violet-500 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50"
      >
        {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
        Salvar Preços
      </button>
    </div>
  )
}

// ── Tab Prompts IA ─────────────────────────────────────────────────────────

function TabPrompts({ config, onSave, saving }: {
  config: FotoIAConfig
  onSave: (p: Partial<FotoIAConfig>) => Promise<void>
  saving: boolean
}) {
  const [selectedTipo, setSelectedTipo] = useState(TIPOS_FOTO[0])
  const [prompts, setPrompts]           = useState(config.prompts ?? {})
  const [modelo, setModelo]             = useState(config.replicateModel ?? REPLICATE_MODELS[0].value)

  const current = prompts[selectedTipo] ?? {}

  function update(field: 'base' | 'negativo', value: string) {
    setPrompts(p => ({ ...p, [selectedTipo]: { ...current, [field]: value } }))
  }

  return (
    <div className="space-y-4">
      {/* Modelo */}
      <div className="card-agency p-4 space-y-3">
        <div className="flex items-center gap-2">
          <Sparkles size={15} className="text-violet-400" />
          <h2 className="font-semibold text-foreground text-sm">Modelo de Geração</h2>
        </div>
        <select
          value={modelo}
          onChange={e => setModelo(e.target.value)}
          className="w-full bg-surface-2 border border-surface-3 rounded-lg px-3 py-2 text-sm text-foreground"
        >
          {REPLICATE_MODELS.map(m => (
            <option key={m.value} value={m.value}>{m.label}</option>
          ))}
        </select>
      </div>

      {/* Prompts por tipo */}
      <div className="card-agency p-4 space-y-4">
        <div className="flex items-center gap-2 mb-1">
          <Sparkles size={15} className="text-violet-400" />
          <h2 className="font-semibold text-foreground text-sm">Prompts por Tipo de Foto</h2>
        </div>

        {/* Selector */}
        <div className="flex gap-2 flex-wrap">
          {TIPOS_FOTO.map(t => (
            <button
              key={t}
              onClick={() => setSelectedTipo(t)}
              className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                selectedTipo === t
                  ? 'bg-violet-600 text-white'
                  : 'bg-surface-2 text-muted-foreground hover:text-foreground'
              }`}
            >
              {TIPOS_FOTO_LABEL[t]}
            </button>
          ))}
        </div>

        {/* Editor */}
        <div className="space-y-3">
          <div>
            <div className="flex justify-between items-center mb-1">
              <label className="text-xs text-muted-foreground font-medium">Prompt Base</label>
              <span className="text-xs text-muted-foreground">{(current.base ?? '').length} chars</span>
            </div>
            <textarea
              value={current.base ?? ''}
              onChange={e => update('base', e.target.value)}
              rows={4}
              placeholder="Descreva o estilo e resultado esperado para este tipo de foto..."
              className="w-full bg-surface-2 border border-surface-3 focus:border-violet-500/50 rounded-lg px-3 py-2 text-sm text-foreground resize-none outline-none transition-colors"
            />
          </div>
          <div>
            <label className="text-xs text-muted-foreground font-medium block mb-1">Prompt Negativo</label>
            <textarea
              value={current.negativo ?? ''}
              onChange={e => update('negativo', e.target.value)}
              rows={2}
              placeholder="Elementos que devem ser evitados nas fotos geradas..."
              className="w-full bg-surface-2 border border-surface-3 focus:border-violet-500/50 rounded-lg px-3 py-2 text-sm text-foreground resize-none outline-none transition-colors"
            />
          </div>
        </div>
      </div>

      <button
        onClick={() => onSave({ prompts, replicateModel: modelo })}
        disabled={saving}
        className="flex items-center gap-2 px-4 py-2 bg-violet-600 hover:bg-violet-500 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50"
      >
        {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
        Salvar Prompts
      </button>
    </div>
  )
}

// ── Tab Templates WhatsApp ─────────────────────────────────────────────────

function TabTemplates({ config, onSave, saving }: {
  config: FotoIAConfig
  onSave: (p: Partial<FotoIAConfig>) => Promise<void>
  saving: boolean
}) {
  const [selectedKey, setSelectedKey] = useState<string>(Object.keys(TEMPLATE_LABELS)[0])
  const [templates, setTemplates]     = useState<Record<string, string>>(config.templates ?? {})
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const currentText = templates[selectedKey] ?? ''
  const availableVars = TEMPLATE_VARS[selectedKey] ?? []

  function insertVar(varName: string) {
    const el = textareaRef.current
    if (!el) return
    const start = el.selectionStart
    const end   = el.selectionEnd
    const updated = currentText.slice(0, start) + varName + currentText.slice(end)
    setTemplates(t => ({ ...t, [selectedKey]: updated }))
    setTimeout(() => {
      el.selectionStart = el.selectionEnd = start + varName.length
      el.focus()
    }, 0)
  }

  // Render preview with variable replacement
  const preview = currentText
    .replace(/\{nome\}/g, 'João Silva')
    .replace(/\{empresa\}/g, 'Empresa ABC')
    .replace(/\{preco\}/g, 'R$ 47,00')
    .replace(/\{pacote\}/g, 'Profissional ⭐')
    .replace(/\{qtdFotos\}/g, '10')
    .replace(/\{revisoes\}/g, '4')
    .replace(/\{valor\}/g, '47,00')
    .replace(/\{tipoPix\}/g, 'email')
    .replace(/\{chavePix\}/g, 'agencia@pix.com')
    .replace(/\{nomeBeneficiario\}/g, 'Agência AC VIP')
    .replace(/\{tema\}/g, 'profissional')
    .replace(/\{link\}/g, 'https://fotoia.app/galeria/abc123')

  return (
    <div className="space-y-4">
      {/* Template selector */}
      <div className="flex gap-2 flex-wrap">
        {Object.entries(TEMPLATE_LABELS).map(([key, label]) => (
          <button
            key={key}
            onClick={() => setSelectedKey(key)}
            className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
              selectedKey === key
                ? 'bg-green-600 text-white'
                : 'bg-surface-2 text-muted-foreground hover:text-foreground'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Editor */}
        <div className="card-agency p-4 space-y-3">
          <div className="flex items-center gap-2">
            <MessageSquare size={15} className="text-green-400" />
            <h3 className="text-sm font-semibold text-foreground">{TEMPLATE_LABELS[selectedKey]}</h3>
          </div>

          <textarea
            ref={textareaRef}
            value={currentText}
            onChange={e => setTemplates(t => ({ ...t, [selectedKey]: e.target.value }))}
            rows={10}
            className="w-full bg-surface-2 border border-surface-3 focus:border-green-500/50 rounded-lg px-3 py-2 text-sm text-foreground font-mono resize-none outline-none transition-colors"
          />

          {availableVars.length > 0 && (
            <div>
              <p className="text-xs text-muted-foreground mb-2">Variáveis disponíveis (clique para inserir):</p>
              <div className="flex flex-wrap gap-1.5">
                {availableVars.map(v => (
                  <button
                    key={v}
                    onClick={() => insertVar(v)}
                    className="px-2 py-0.5 bg-green-500/10 border border-green-500/30 text-green-400 text-xs rounded font-mono hover:bg-green-500/20 transition-colors"
                  >
                    {v}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Preview */}
        <div className="card-agency p-4 space-y-3">
          <h3 className="text-sm font-semibold text-foreground">Preview</h3>
          <div className="bg-[#075e54]/10 border border-[#075e54]/20 rounded-lg p-3 min-h-[200px]">
            <div className="bg-[#dcf8c6]/10 rounded-lg p-3 max-w-[85%] ml-auto">
              <p className="text-sm text-foreground whitespace-pre-wrap break-words">{preview || <span className="text-muted-foreground italic">Preview aparecerá aqui...</span>}</p>
              <p className="text-xs text-muted-foreground mt-1 text-right">Exemplo</p>
            </div>
          </div>
        </div>
      </div>

      <button
        onClick={() => onSave({ templates })}
        disabled={saving}
        className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-500 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50"
      >
        {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
        Salvar Templates
      </button>
    </div>
  )
}

// ── Tab Integrações ────────────────────────────────────────────────────────

function TabIntegracoes({ config, onSave, saving }: {
  config: FotoIAConfig
  onSave: (p: Partial<FotoIAConfig>) => Promise<void>
  saving: boolean
}) {
  type Status = 'idle' | 'testing' | 'ok' | 'error'
  const [statuses, setStatuses] = useState<Record<string, Status>>({
    replicate: 'idle', pix: 'idle', storage: 'idle', whatsapp: 'idle',
  })

  async function testConnection(key: string) {
    setStatuses(s => ({ ...s, [key]: 'testing' }))
    try {
      const res = await fetch(`/api/foto-ia/configuracoes/test?provider=${key}`)
      setStatuses(s => ({ ...s, [key]: res.ok ? 'ok' : 'error' }))
    } catch {
      setStatuses(s => ({ ...s, [key]: 'error' }))
    }
    setTimeout(() => setStatuses(s => ({ ...s, [key]: 'idle' })), 4000)
  }

  const INTEGRACOES = [
    {
      key: 'replicate',
      label: 'Replicate (Geração de Imagens)',
      desc: 'API de geração de fotos com IA (PhotoMaker, SDXL, FLUX)',
      envVar: 'REPLICATE_API_TOKEN',
      color: 'violet',
    },
    {
      key: 'pix',
      label: 'PIX Manual',
      desc: 'Chave PIX da agência para cobrança + validação de comprovante',
      envVar: 'PIX_CHAVE + ANTHROPIC_API_KEY',
      color: 'gold',
    },
    {
      key: 'storage',
      label: 'Storage Local',
      desc: 'Armazenamento das fotos geradas em /public/uploads/',
      envVar: 'LOCAL (sem variável)',
      color: 'blue',
    },
    {
      key: 'whatsapp',
      label: 'WhatsApp (Baileys)',
      desc: 'Envio de mensagens e imagens ao cliente via WhatsApp',
      envVar: 'Gerenciado pelo Socket.io server',
      color: 'green',
    },
  ]

  function StatusIcon({ status }: { status: Status }) {
    if (status === 'testing') return <Loader2 size={16} className="animate-spin text-muted-foreground" />
    if (status === 'ok')      return <CheckCircle size={16} className="text-green-400" />
    if (status === 'error')   return <XCircle size={16} className="text-red-400" />
    return <div className="w-2 h-2 rounded-full bg-surface-3 mt-0.5" />
  }

  return (
    <div className="space-y-3">
      {INTEGRACOES.map(int => (
        <div key={int.key} className="card-agency p-4 flex items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <StatusIcon status={statuses[int.key]} />
            <div>
              <p className="text-sm font-medium text-foreground">{int.label}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{int.desc}</p>
              <code className="text-xs text-muted-foreground/70 mt-1 block">{int.envVar}</code>
            </div>
          </div>
          <button
            onClick={() => testConnection(int.key)}
            disabled={statuses[int.key] === 'testing'}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-surface-2 hover:bg-surface-1 border border-surface-3 text-muted-foreground hover:text-foreground rounded-lg transition-colors disabled:opacity-50 shrink-0"
          >
            <RefreshCw size={12} />
            Testar
          </button>
        </div>
      ))}

      {/* Configurações avançadas */}
      <div className="card-agency p-4 space-y-3">
        <h3 className="text-sm font-semibold text-foreground">Limites de Geração</h3>
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div>
            <label className="text-xs text-muted-foreground block mb-1">Gerações simultâneas</label>
            <input
              type="number" min={1} max={10}
              defaultValue={3}
              className="w-full bg-surface-2 border border-surface-3 rounded px-3 py-1.5 text-foreground text-sm"
              onChange={e => onSave({ maxSimultaneos: Number(e.target.value) } as Partial<FotoIAConfig>)}
            />
          </div>
          <div>
            <label className="text-xs text-muted-foreground block mb-1">Tentativas máximas</label>
            <input
              type="number" min={1} max={5}
              defaultValue={3}
              className="w-full bg-surface-2 border border-surface-3 rounded px-3 py-1.5 text-foreground text-sm"
              onChange={e => onSave({ maxTentativas: Number(e.target.value) } as Partial<FotoIAConfig>)}
            />
          </div>
        </div>
      </div>
    </div>
  )
}
