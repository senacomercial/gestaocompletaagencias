'use client'

import { useState } from 'react'
import useSWR from 'swr'
import {
  Layers, Plus, Trash2, ChevronDown, ChevronRight, Loader2,
  ClipboardList, X,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'

interface PresetTarefa {
  id: string
  titulo: string
  descricao?: string | null
  ordem: number
}

interface Preset {
  id: string
  nome: string
  descricao?: string | null
  tarefas: PresetTarefa[]
}

interface NovoPreset {
  nome: string
  descricao: string
  tarefas: Array<{ titulo: string; descricao: string }>
}

const fetcher = (url: string) => fetch(url).then((r) => r.json())

export default function PresetsPage() {
  const { data: presets, isLoading, mutate } = useSWR<Preset[]>('/api/presets', fetcher)
  const [expanded, setExpanded] = useState<Set<string>>(new Set())
  const [showForm, setShowForm] = useState(false)
  const [deletando, setDeletando] = useState<string | null>(null)
  const [salvando, setSalvando] = useState(false)
  const [form, setForm] = useState<NovoPreset>({
    nome: '',
    descricao: '',
    tarefas: [{ titulo: '', descricao: '' }],
  })

  const toggleExpanded = (id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Excluir este preset?')) return
    setDeletando(id)
    try {
      await fetch(`/api/presets/${id}`, { method: 'DELETE' })
      mutate()
    } finally {
      setDeletando(null)
    }
  }

  const handleSave = async () => {
    if (!form.nome.trim()) return
    const tarefasValidas = form.tarefas.filter((t) => t.titulo.trim())
    if (tarefasValidas.length === 0) return

    setSalvando(true)
    try {
      const res = await fetch('/api/presets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nome: form.nome.trim(),
          descricao: form.descricao.trim() || undefined,
          tarefas: tarefasValidas.map((t, i) => ({
            titulo: t.titulo.trim(),
            descricao: t.descricao.trim() || undefined,
            ordem: i,
          })),
        }),
      })
      if (res.ok) {
        setShowForm(false)
        setForm({ nome: '', descricao: '', tarefas: [{ titulo: '', descricao: '' }] })
        mutate()
      }
    } finally {
      setSalvando(false)
    }
  }

  const addTarefa = () =>
    setForm((f) => ({ ...f, tarefas: [...f.tarefas, { titulo: '', descricao: '' }] }))

  const removeTarefa = (idx: number) =>
    setForm((f) => ({ ...f, tarefas: f.tarefas.filter((_, i) => i !== idx) }))

  const updateTarefa = (idx: number, field: 'titulo' | 'descricao', value: string) =>
    setForm((f) => ({
      ...f,
      tarefas: f.tarefas.map((t, i) => i === idx ? { ...t, [field]: value } : t),
    }))

  return (
    <div className="max-w-2xl mx-auto px-6 py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-base font-semibold text-foreground">Presets de Tarefas</h1>
          <p className="text-xs text-muted-foreground">Templates de tarefas para aplicar em projetos</p>
        </div>
        <Button
          onClick={() => setShowForm(true)}
          className="bg-gold-400 text-surface-base hover:bg-gold-500 text-xs h-8"
        >
          <Plus className="w-3.5 h-3.5 mr-1" /> Novo Preset
        </Button>
      </div>

      {/* Formulário novo preset */}
      {showForm && (
        <div className="bg-surface-1 border border-gold-400/30 rounded-lg p-4 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium text-foreground">Novo Preset</h3>
            <Button variant="ghost" size="icon" className="w-6 h-6" onClick={() => setShowForm(false)}>
              <X className="w-3.5 h-3.5" />
            </Button>
          </div>

          <div className="space-y-3">
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">Nome *</label>
              <input
                autoFocus
                className="w-full h-8 px-3 rounded-md bg-surface-2 border border-surface-3 text-sm text-foreground placeholder-muted-foreground focus:outline-none focus:border-gold-400/50"
                placeholder="Ex: Onboarding de Cliente"
                value={form.nome}
                onChange={(e) => setForm((f) => ({ ...f, nome: e.target.value }))}
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">Descrição</label>
              <input
                className="w-full h-8 px-3 rounded-md bg-surface-2 border border-surface-3 text-sm text-foreground placeholder-muted-foreground focus:outline-none focus:border-gold-400/50"
                placeholder="Opcional"
                value={form.descricao}
                onChange={(e) => setForm((f) => ({ ...f, descricao: e.target.value }))}
              />
            </div>
          </div>

          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground">Tarefas do preset</p>
            {form.tarefas.map((t, i) => (
              <div key={i} className="flex items-start gap-2">
                <div className="flex-1 space-y-1.5">
                  <input
                    className="w-full h-8 px-3 rounded-md bg-surface-2 border border-surface-3 text-sm text-foreground placeholder-muted-foreground focus:outline-none focus:border-gold-400/50"
                    placeholder={`Tarefa ${i + 1} *`}
                    value={t.titulo}
                    onChange={(e) => updateTarefa(i, 'titulo', e.target.value)}
                  />
                  <input
                    className="w-full h-7 px-3 rounded-md bg-surface-2 border border-surface-3 text-xs text-foreground placeholder-muted-foreground focus:outline-none focus:border-gold-400/50"
                    placeholder="Descrição (opcional)"
                    value={t.descricao}
                    onChange={(e) => updateTarefa(i, 'descricao', e.target.value)}
                  />
                </div>
                {form.tarefas.length > 1 && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="w-7 h-7 flex-shrink-0 text-muted-foreground hover:text-red-400 mt-0.5"
                    onClick={() => removeTarefa(i)}
                  >
                    <X className="w-3.5 h-3.5" />
                  </Button>
                )}
              </div>
            ))}
            <Button
              variant="ghost"
              size="sm"
              onClick={addTarefa}
              className="text-xs text-muted-foreground hover:text-foreground h-7"
            >
              <Plus className="w-3.5 h-3.5 mr-1" /> Adicionar tarefa
            </Button>
          </div>

          <div className="flex items-center gap-2 pt-1">
            <Button
              onClick={handleSave}
              disabled={!form.nome.trim() || form.tarefas.filter((t) => t.titulo.trim()).length === 0 || salvando}
              className="bg-gold-400 text-surface-base hover:bg-gold-500 text-xs h-8"
            >
              {salvando && <Loader2 className="w-3 h-3 animate-spin mr-1" />}
              Salvar Preset
            </Button>
            <Button
              variant="ghost"
              onClick={() => setShowForm(false)}
              className="text-xs h-8 text-muted-foreground"
            >
              Cancelar
            </Button>
          </div>
        </div>
      )}

      {/* Lista de presets */}
      {isLoading && (
        <div className="space-y-2">
          {[1, 2].map((i) => <Skeleton key={i} className="h-16 w-full bg-surface-2" />)}
        </div>
      )}

      {!isLoading && (presets ?? []).length === 0 && !showForm && (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <ClipboardList className="w-8 h-8 text-muted-foreground/30 mb-3" />
          <p className="text-sm text-muted-foreground">Nenhum preset criado ainda</p>
          <p className="text-xs text-muted-foreground mt-1">
            Presets permitem aplicar conjuntos de tarefas padrão em novos projetos
          </p>
        </div>
      )}

      <div className="space-y-2">
        {(presets ?? []).map((preset) => (
          <div
            key={preset.id}
            className="bg-surface-1 border border-surface-3 rounded-lg overflow-hidden"
          >
            <div className="flex items-center gap-3 px-4 py-3">
              <button
                className="flex-1 flex items-center gap-2 text-left"
                onClick={() => toggleExpanded(preset.id)}
              >
                {expanded.has(preset.id)
                  ? <ChevronDown className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                  : <ChevronRight className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                }
                <div>
                  <p className="text-sm font-medium text-foreground">{preset.nome}</p>
                  {preset.descricao && (
                    <p className="text-xs text-muted-foreground">{preset.descricao}</p>
                  )}
                </div>
                <span className="ml-auto text-xs text-muted-foreground mr-2">
                  {preset.tarefas.length} tarefa{preset.tarefas.length !== 1 ? 's' : ''}
                </span>
              </button>
              <Button
                variant="ghost"
                size="icon"
                className="w-7 h-7 text-muted-foreground hover:text-red-400"
                onClick={() => handleDelete(preset.id)}
                disabled={deletando === preset.id}
              >
                {deletando === preset.id
                  ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  : <Trash2 className="w-3.5 h-3.5" />
                }
              </Button>
            </div>

            {expanded.has(preset.id) && (
              <div className="border-t border-surface-3 px-4 pb-3 pt-2 space-y-1">
                {preset.tarefas.map((t, i) => (
                  <div key={t.id} className="flex items-start gap-2 py-1">
                    <span className="text-xs text-muted-foreground flex-shrink-0 mt-0.5 w-4">{i + 1}.</span>
                    <div>
                      <p className="text-sm text-foreground">{t.titulo}</p>
                      {t.descricao && (
                        <p className="text-xs text-muted-foreground">{t.descricao}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
