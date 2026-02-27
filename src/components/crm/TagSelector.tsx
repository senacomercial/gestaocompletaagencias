'use client'

import { useState } from 'react'
import { X, Plus, Check } from 'lucide-react'
import { useTags } from '@/hooks/useTags'
import { TagBadge } from './TagBadge'

interface TagSelectorProps {
  leadId: string
  selectedTagIds: string[]
  onAdd: (tagId: string) => Promise<void>
  onRemove: (tagId: string) => Promise<void>
}

export function TagSelector({ leadId: _leadId, selectedTagIds, onAdd, onRemove }: TagSelectorProps) {
  const { tags } = useTags()
  const [open, setOpen] = useState(false)
  const [newTagNome, setNewTagNome] = useState('')
  const [newTagCor, setNewTagCor] = useState('#D4AF37')
  const [creating, setCreating] = useState(false)

  const selectedTags = tags.filter((t: { id: string }) => selectedTagIds.includes(t.id))
  const availableTags = tags.filter((t: { id: string }) => !selectedTagIds.includes(t.id))

  const handleCreateTag = async () => {
    if (!newTagNome.trim()) return
    setCreating(true)
    try {
      const res = await fetch('/api/tags', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nome: newTagNome.trim(), cor: newTagCor }),
      })
      if (res.ok) {
        const tag = await res.json()
        await onAdd(tag.id)
        setNewTagNome('')
        setNewTagCor('#D4AF37')
      }
    } finally {
      setCreating(false)
    }
  }

  return (
    <div className="space-y-2">
      {/* Tags selecionadas */}
      <div className="flex flex-wrap gap-1.5">
        {selectedTags.map((tag: { id: string; nome: string; cor: string }) => (
          <span key={tag.id} className="flex items-center gap-1">
            <TagBadge nome={tag.nome} cor={tag.cor} />
            <button
              onClick={() => onRemove(tag.id)}
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              <X className="h-3 w-3" />
            </button>
          </span>
        ))}
        <button
          onClick={() => setOpen(!open)}
          className="inline-flex items-center gap-1 rounded-full border border-dashed border-surface-3 px-2 py-0.5 text-[10px] text-muted-foreground hover:border-gold-500 hover:text-gold-500 transition-colors"
        >
          <Plus className="h-3 w-3" />
          Adicionar tag
        </button>
      </div>

      {/* Dropdown de seleção */}
      {open && (
        <div className="rounded-lg border border-surface-3 bg-surface-1 p-3 space-y-3 shadow-lg">
          {/* Tags disponíveis */}
          {availableTags.length > 0 && (
            <div className="space-y-1">
              <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Tags disponíveis</p>
              <div className="flex flex-wrap gap-1.5">
                {availableTags.map((tag: { id: string; nome: string; cor: string }) => (
                  <button
                    key={tag.id}
                    onClick={() => onAdd(tag.id)}
                    className="flex items-center gap-1 group"
                  >
                    <TagBadge nome={tag.nome} cor={tag.cor} />
                    <Check className="h-3 w-3 opacity-0 group-hover:opacity-100 text-gold-500 transition-opacity" />
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Criar nova tag */}
          <div className="space-y-1.5">
            <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Nova tag</p>
            <div className="flex gap-2">
              <input
                type="color"
                value={newTagCor}
                onChange={(e) => setNewTagCor(e.target.value)}
                className="h-8 w-8 rounded cursor-pointer border border-surface-3 bg-transparent"
              />
              <input
                value={newTagNome}
                onChange={(e) => setNewTagNome(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleCreateTag()}
                placeholder="Nome da tag..."
                className="flex-1 rounded-md border border-surface-3 bg-surface-2 px-2 py-1 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-gold-500"
              />
              <button
                onClick={handleCreateTag}
                disabled={creating || !newTagNome.trim()}
                className="rounded-md bg-gold-500 px-2 py-1 text-xs font-medium text-black hover:bg-gold-600 disabled:opacity-50 transition-colors"
              >
                <Plus className="h-4 w-4" />
              </button>
            </div>
          </div>

          <button
            onClick={() => setOpen(false)}
            className="w-full text-xs text-muted-foreground hover:text-foreground transition-colors text-center"
          >
            Fechar
          </button>
        </div>
      )}
    </div>
  )
}
