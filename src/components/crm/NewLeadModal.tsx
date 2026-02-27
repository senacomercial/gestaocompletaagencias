'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'
import { Loader2 } from 'lucide-react'
import type { FunilComEtapas } from '@/types'
import { createLeadSchema, type CreateLeadInput } from '@/lib/validators/lead'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

interface NewLeadModalProps {
  open: boolean
  onClose: () => void
  onCreated: () => void
  funis: FunilComEtapas[]
  defaultFunilId?: string
}

export function NewLeadModal({ open, onClose, onCreated, funis, defaultFunilId }: NewLeadModalProps) {
  const [saving, setSaving] = useState(false)
  const [selectedFunilId, setSelectedFunilId] = useState(defaultFunilId ?? funis[0]?.id ?? '')

  const selectedFunil = funis.find((f) => f.id === selectedFunilId)

  const {
    register,
    handleSubmit,
    setValue,
    reset,
    formState: { errors },
  } = useForm<CreateLeadInput>({
    resolver: zodResolver(createLeadSchema),
    defaultValues: {
      funilId: defaultFunilId ?? funis[0]?.id ?? '',
      etapaId: funis[0]?.etapas[0]?.id ?? '',
    },
  })

  const handleFunilChange = (funilId: string) => {
    setSelectedFunilId(funilId)
    setValue('funilId', funilId)
    const funil = funis.find((f) => f.id === funilId)
    if (funil?.etapas[0]) setValue('etapaId', funil.etapas[0].id)
  }

  const onSubmit = async (data: CreateLeadInput) => {
    setSaving(true)
    try {
      const res = await fetch('/api/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error ?? 'Erro ao criar lead')
      }
      toast.success('Lead criado com sucesso')
      reset()
      onCreated()
      onClose()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Erro ao criar lead')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Novo Lead</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid gap-1.5">
            <Label htmlFor="nome">Nome *</Label>
            <Input id="nome" {...register('nome')} placeholder="Nome do lead" autoFocus />
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
              <Label>Funil</Label>
              <Select value={selectedFunilId} onValueChange={handleFunilChange}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o funil" />
                </SelectTrigger>
                <SelectContent>
                  {funis.map((funil) => (
                    <SelectItem key={funil.id} value={funil.id}>
                      {funil.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-1.5">
              <Label>Etapa</Label>
              <Select
                defaultValue={selectedFunil?.etapas[0]?.id}
                onValueChange={(v) => setValue('etapaId', v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione a etapa" />
                </SelectTrigger>
                <SelectContent>
                  {selectedFunil?.etapas.map((etapa) => (
                    <SelectItem key={etapa.id} value={etapa.id}>
                      <span className="flex items-center gap-2">
                        <span
                          className="h-2 w-2 rounded-full"
                          style={{ backgroundColor: etapa.cor }}
                        />
                        {etapa.nome}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.etapaId && <p className="text-xs text-destructive">{errors.etapaId.message}</p>}
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit" disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 animate-spin mr-1" />}
              Criar Lead
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
