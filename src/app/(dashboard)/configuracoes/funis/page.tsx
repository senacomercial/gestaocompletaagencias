'use client'

import { useState } from 'react'
import { useFunis } from '@/hooks/useFunis'
import { Loader2, Plus, Trash2, Pencil, ChevronDown, ChevronRight } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

interface EtapaLocal {
  id: string
  nome: string
  cor: string
  isVendaRealizada: boolean
  ordem: number
}

interface FunilLocal {
  id: string
  nome: string
  descricao?: string | null
  etapas: EtapaLocal[]
  _count: { leads: number; etapas: number }
}

function EtapaRow({ etapa, funilId, onDelete, onUpdate }: { etapa: EtapaLocal; funilId: string; onDelete: () => void; onUpdate: () => void }) {
  const [editing, setEditing] = useState(false)
  const [nome, setNome] = useState(etapa.nome)
  const [cor, setCor] = useState(etapa.cor)
  const [saving, setSaving] = useState(false)

  const save = async () => {
    setSaving(true)
    try {
      const res = await fetch(`/api/funis/${funilId}/etapas/${etapa.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nome, cor }),
      })
      if (!res.ok) throw new Error()
      toast.success('Etapa atualizada')
      setEditing(false)
      onUpdate()
    } catch {
      toast.error('Erro ao atualizar etapa')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!confirm(`Deletar etapa "${etapa.nome}"?`)) return
    try {
      const res = await fetch(`/api/funis/${funilId}/etapas/${etapa.id}`, { method: 'DELETE' })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error)
      }
      toast.success('Etapa deletada')
      onDelete()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Erro ao deletar etapa')
    }
  }

  return (
    <div className="flex items-center gap-3 p-2 rounded-md border border-surface-3 bg-surface-2">
      {editing ? (
        <>
          <input
            type="color"
            value={cor}
            onChange={(e) => setCor(e.target.value)}
            className="h-7 w-7 rounded cursor-pointer border-0 bg-transparent"
          />
          <Input
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            className="h-7 text-sm flex-1"
          />
          <Button size="sm" onClick={save} disabled={saving} className="h-7 px-2">
            {saving ? <Loader2 className="h-3 w-3 animate-spin" /> : 'Salvar'}
          </Button>
          <Button size="sm" variant="ghost" onClick={() => setEditing(false)} className="h-7 px-2">
            Cancelar
          </Button>
        </>
      ) : (
        <>
          <span className="h-3 w-3 rounded-full flex-shrink-0" style={{ backgroundColor: etapa.cor }} />
          <span className="text-sm flex-1 truncate">{etapa.nome}</span>
          {etapa.isVendaRealizada && (
            <span className="text-[10px] text-emerald-500 font-medium">Venda</span>
          )}
          <button onClick={() => setEditing(true)} className="text-muted-foreground hover:text-foreground transition-colors">
            <Pencil className="h-3.5 w-3.5" />
          </button>
          <button onClick={handleDelete} className="text-muted-foreground hover:text-destructive transition-colors">
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </>
      )}
    </div>
  )
}

function FunilCard({ funil, onUpdate }: { funil: FunilLocal; onUpdate: () => void }) {
  const [expanded, setExpanded] = useState(false)
  const [editingNome, setEditingNome] = useState(false)
  const [nome, setNome] = useState(funil.nome)
  const [novaEtapaNome, setNovaEtapaNome] = useState('')
  const [novaEtapaCor, setNovaEtapaCor] = useState('#D4AF37')
  const [saving, setSaving] = useState(false)

  const saveNome = async () => {
    setSaving(true)
    try {
      const res = await fetch(`/api/funis/${funil.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nome }),
      })
      if (!res.ok) throw new Error()
      toast.success('Funil atualizado')
      setEditingNome(false)
      onUpdate()
    } catch {
      toast.error('Erro ao atualizar funil')
    } finally {
      setSaving(false)
    }
  }

  const handleDeleteFunil = async () => {
    if (!confirm(`Deletar funil "${funil.nome}"? Todos os dados serão perdidos.`)) return
    try {
      const res = await fetch(`/api/funis/${funil.id}`, { method: 'DELETE' })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error)
      }
      toast.success('Funil deletado')
      onUpdate()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Erro ao deletar funil')
    }
  }

  const addEtapa = async () => {
    if (!novaEtapaNome.trim()) return
    setSaving(true)
    try {
      const res = await fetch(`/api/funis/${funil.id}/etapas`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nome: novaEtapaNome.trim(), cor: novaEtapaCor }),
      })
      if (!res.ok) throw new Error()
      toast.success('Etapa criada')
      setNovaEtapaNome('')
      setNovaEtapaCor('#D4AF37')
      onUpdate()
    } catch {
      toast.error('Erro ao criar etapa')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="rounded-xl border border-surface-3 bg-surface-1 overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-3 p-4">
        <button onClick={() => setExpanded(!expanded)} className="text-muted-foreground hover:text-foreground transition-colors">
          {expanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
        </button>

        {editingNome ? (
          <div className="flex items-center gap-2 flex-1">
            <Input value={nome} onChange={(e) => setNome(e.target.value)} className="h-8 text-sm" />
            <Button size="sm" onClick={saveNome} disabled={saving} className="h-8">
              {saving ? <Loader2 className="h-3 w-3 animate-spin" /> : 'Salvar'}
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setEditingNome(false)} className="h-8">Cancelar</Button>
          </div>
        ) : (
          <>
            <div className="flex-1">
              <h3 className="text-sm font-semibold text-foreground">{funil.nome}</h3>
              <p className="text-xs text-muted-foreground">{funil._count.leads} leads · {funil._count.etapas} etapas</p>
            </div>
            <button onClick={() => setEditingNome(true)} className="text-muted-foreground hover:text-foreground transition-colors">
              <Pencil className="h-4 w-4" />
            </button>
            <button onClick={handleDeleteFunil} className="text-muted-foreground hover:text-destructive transition-colors">
              <Trash2 className="h-4 w-4" />
            </button>
          </>
        )}
      </div>

      {/* Etapas (expandido) */}
      {expanded && (
        <div className="border-t border-surface-3 p-4 space-y-2">
          {funil.etapas.map((etapa) => (
            <EtapaRow
              key={etapa.id}
              etapa={etapa}
              funilId={funil.id}
              onDelete={onUpdate}
              onUpdate={onUpdate}
            />
          ))}

          {/* Nova etapa */}
          <div className="flex items-center gap-2 pt-2">
            <input
              type="color"
              value={novaEtapaCor}
              onChange={(e) => setNovaEtapaCor(e.target.value)}
              className="h-8 w-8 rounded cursor-pointer border border-surface-3 bg-transparent"
            />
            <Input
              value={novaEtapaNome}
              onChange={(e) => setNovaEtapaNome(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && addEtapa()}
              placeholder="Nome da nova etapa..."
              className="h-8 text-sm flex-1"
            />
            <Button size="sm" onClick={addEtapa} disabled={saving || !novaEtapaNome.trim()} className="h-8">
              <Plus className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}

export default function FunisPage() {
  const { funis, isLoading, mutate } = useFunis()
  const [novoFunilNome, setNovoFunilNome] = useState('')
  const [creating, setCreating] = useState(false)

  const createFunil = async () => {
    if (!novoFunilNome.trim()) return
    setCreating(true)
    try {
      const res = await fetch('/api/funis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nome: novoFunilNome.trim() }),
      })
      if (!res.ok) throw new Error()
      toast.success('Funil criado')
      setNovoFunilNome('')
      mutate()
    } catch {
      toast.error('Erro ao criar funil')
    } finally {
      setCreating(false)
    }
  }

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Funis de Venda</h1>
        <p className="text-sm text-muted-foreground mt-1">Gerencie seus funis e etapas</p>
      </div>

      {/* Criar novo funil */}
      <div className="rounded-xl border border-surface-3 bg-surface-1 p-4">
        <Label className="text-sm font-medium">Novo Funil</Label>
        <div className="flex gap-2 mt-2">
          <Input
            value={novoFunilNome}
            onChange={(e) => setNovoFunilNome(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && createFunil()}
            placeholder="Nome do funil..."
            className="flex-1"
          />
          <Button onClick={createFunil} disabled={creating || !novoFunilNome.trim()}>
            {creating ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Plus className="h-4 w-4 mr-1" />}
            Criar
          </Button>
        </div>
      </div>

      {/* Lista de funis */}
      {isLoading ? (
        <div className="flex items-center justify-center h-32">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <div className="space-y-3">
          {funis.map((funil: FunilLocal) => (
            <FunilCard key={funil.id} funil={funil} onUpdate={() => mutate()} />
          ))}
          {funis.length === 0 && (
            <p className="text-center text-sm text-muted-foreground py-8">
              Nenhum funil criado. Crie o primeiro funil acima.
            </p>
          )}
        </div>
      )}
    </div>
  )
}
