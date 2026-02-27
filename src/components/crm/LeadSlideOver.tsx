'use client'

import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'
import { Trash2, Loader2, MessageSquare, User } from 'lucide-react'
import type { LeadComDetalhes } from '@/types'
import { updateLeadSchema, type UpdateLeadInput } from '@/lib/validators/lead'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter } from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { TagSelector } from './TagSelector'
import { WhatsAppChat } from './WhatsAppChat'

type Tab = 'dados' | 'whatsapp'

interface LeadSlideOverProps {
  lead: LeadComDetalhes | null
  open: boolean
  onClose: () => void
  onUpdate: (lead: LeadComDetalhes) => void
  onDelete: (leadId: string) => void
}

export function LeadSlideOver({ lead, open, onClose, onUpdate, onDelete }: LeadSlideOverProps) {
  const [tab, setTab] = useState<Tab>('dados')
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([])

  const { register, handleSubmit, reset, formState: { isDirty, errors } } = useForm<UpdateLeadInput>({
    resolver: zodResolver(updateLeadSchema),
  })

  useEffect(() => {
    if (lead) {
      reset({
        nome: lead.nome,
        email: lead.email ?? '',
        telefone: lead.telefone ?? '',
        empresa: lead.empresa ?? '',
        vgvTotal: lead.vgvTotal ? Number(lead.vgvTotal) : undefined,
        recorrenciaMensal: lead.recorrenciaMensal ? Number(lead.recorrenciaMensal) : undefined,
      })
      setSelectedTagIds(lead.tags.map(({ tag }) => tag.id))
    }
  }, [lead, reset])

  // Resetar aba ao mudar de lead
  useEffect(() => {
    if (open) setTab('dados')
  }, [lead?.id, open])

  const onSubmit = async (data: UpdateLeadInput) => {
    if (!lead) return
    setSaving(true)
    try {
      const res = await fetch(`/api/leads/${lead.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      if (!res.ok) throw new Error('Falha ao salvar')
      const updated = await res.json()
      onUpdate(updated)
      toast.success('Lead atualizado')
    } catch {
      toast.error('Erro ao salvar lead')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!lead) return
    if (!confirm(`Deletar "${lead.nome}"? Esta ação não pode ser desfeita.`)) return
    setDeleting(true)
    try {
      const res = await fetch(`/api/leads/${lead.id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Falha ao deletar')
      toast.success('Lead deletado')
      onDelete(lead.id)
      onClose()
    } catch {
      toast.error('Erro ao deletar lead')
    } finally {
      setDeleting(false)
    }
  }

  const handleAddTag = async (tagId: string) => {
    if (!lead) return
    await fetch(`/api/leads/${lead.id}/tags`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tagId }),
    })
    setSelectedTagIds((prev) => [...prev, tagId])
  }

  const handleRemoveTag = async (tagId: string) => {
    if (!lead) return
    await fetch(`/api/leads/${lead.id}/tags`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tagId }),
    })
    setSelectedTagIds((prev) => prev.filter((id) => id !== tagId))
  }

  return (
    <Sheet open={open} onOpenChange={(v) => !v && onClose()}>
      <SheetContent className="flex flex-col">
        <SheetHeader>
          <SheetTitle>{lead?.nome ?? 'Lead'}</SheetTitle>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span
              className="inline-block h-2 w-2 rounded-full"
              style={{ backgroundColor: lead?.etapa.cor }}
            />
            {lead?.etapa.nome}
          </div>
        </SheetHeader>

        {/* Tabs */}
        <div className="flex border-b border-surface-3 mt-2">
          <button
            onClick={() => setTab('dados')}
            className={`flex items-center gap-1.5 px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              tab === 'dados'
                ? 'border-gold-500 text-gold-500'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            <User className="h-3.5 w-3.5" />
            Dados
          </button>
          <button
            onClick={() => setTab('whatsapp')}
            className={`flex items-center gap-1.5 px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              tab === 'whatsapp'
                ? 'border-gold-500 text-gold-500'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            <MessageSquare className="h-3.5 w-3.5" />
            WhatsApp
          </button>
        </div>

        {/* Tab: Dados */}
        {tab === 'dados' && (
          <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4 py-4 overflow-y-auto flex-1">
            <div className="grid gap-1.5">
              <Label htmlFor="nome">Nome *</Label>
              <Input id="nome" {...register('nome')} />
              {errors.nome && <p className="text-xs text-destructive">{errors.nome.message}</p>}
            </div>

            <div className="grid gap-1.5">
              <Label htmlFor="empresa">Empresa</Label>
              <Input id="empresa" {...register('empresa')} placeholder="Nome da empresa" />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-1.5">
                <Label htmlFor="email">E-mail</Label>
                <Input id="email" type="email" {...register('email')} />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="telefone">Telefone</Label>
                <Input id="telefone" {...register('telefone')} placeholder="(11) 99999-0000" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-1.5">
                <Label htmlFor="vgvTotal">VGV Total (R$)</Label>
                <Input id="vgvTotal" type="number" step="0.01" min="0" {...register('vgvTotal', { valueAsNumber: true })} />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="recorrenciaMensal">Recorrência/mês (R$)</Label>
                <Input id="recorrenciaMensal" type="number" step="0.01" min="0" {...register('recorrenciaMensal', { valueAsNumber: true })} />
              </div>
            </div>

            <div className="grid gap-1.5">
              <Label>Tags</Label>
              {lead && (
                <TagSelector
                  leadId={lead.id}
                  selectedTagIds={selectedTagIds}
                  onAdd={handleAddTag}
                  onRemove={handleRemoveTag}
                />
              )}
            </div>

            <SheetFooter className="mt-auto pt-4 border-t border-surface-3 flex gap-2">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleDelete}
                disabled={deleting}
                className="text-destructive hover:text-destructive hover:bg-destructive/10 mr-auto"
              >
                {deleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
              </Button>
              <Button type="button" variant="outline" size="sm" onClick={onClose}>
                Cancelar
              </Button>
              <Button type="submit" size="sm" disabled={!isDirty || saving}>
                {saving ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}
                Salvar
              </Button>
            </SheetFooter>
          </form>
        )}

        {/* Tab: WhatsApp */}
        {tab === 'whatsapp' && lead && (
          <div className="flex-1 min-h-0 overflow-hidden">
            <WhatsAppChat leadId={lead.id} telefone={lead.telefone} />
          </div>
        )}
      </SheetContent>
    </Sheet>
  )
}
