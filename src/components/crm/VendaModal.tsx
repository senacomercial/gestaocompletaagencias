'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { Loader2, Trophy } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import type { LeadComDetalhes } from '@/types'

const vendaSchema = z.object({
  vgvTotal: z.number({ required_error: 'Obrigatório' }).positive('Deve ser positivo'),
  tipoPagamento: z.enum(['RECORRENTE', 'PARCELADO', 'AVULSO']),
  tipoServico: z.string().min(1, 'Obrigatório'),
  dataInicio: z.string().min(1, 'Obrigatório'),
  recorrenciaMensal: z.number().positive().optional(),
  diaVencimento: z.number().int().min(1).max(28).optional(),
  numeroParcelas: z.number().int().positive().optional(),
  dataVencimentoUnico: z.string().optional(),
})

type VendaInput = z.infer<typeof vendaSchema>

interface VendaModalProps {
  lead: LeadComDetalhes | null
  etapaId: string
  open: boolean
  onClose: () => void
  onSuccess: () => void
  onCancel: () => void
}

const TIPOS_SERVICO = [
  'Social Media',
  'Tráfego Pago',
  'Site',
  'SEO',
  'Branding',
  'Consultoria',
  'Produção de Conteúdo',
  'Email Marketing',
  'Outros',
]

export function VendaModal({ lead, etapaId, open, onClose, onSuccess, onCancel }: VendaModalProps) {
  const [saving, setSaving] = useState(false)

  const { register, handleSubmit, watch, setValue, formState: { errors } } = useForm<VendaInput>({
    resolver: zodResolver(vendaSchema),
    defaultValues: {
      tipoPagamento: 'RECORRENTE',
      dataInicio: new Date().toISOString().split('T')[0],
    },
  })

  const tipoPagamento = watch('tipoPagamento')
  const vgvTotal = watch('vgvTotal')
  const numeroParcelas = watch('numeroParcelas')

  const valorParcela = vgvTotal && numeroParcelas ? (vgvTotal / numeroParcelas).toFixed(2) : null

  const onSubmit = async (data: VendaInput) => {
    if (!lead) return
    setSaving(true)
    try {
      const res = await fetch('/api/conversao', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          leadId: lead.id,
          etapaId,
          ...data,
          dataInicio: new Date(data.dataInicio).toISOString(),
          dataVencimentoUnico: data.dataVencimentoUnico
            ? new Date(data.dataVencimentoUnico).toISOString()
            : undefined,
        }),
      })

      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Erro ao registrar venda')
      }

      toast.success(`🏆 Venda registrada! Projeto criado para ${lead.empresa || lead.nome}`)
      onSuccess()
      onClose()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro ao registrar venda')
    } finally {
      setSaving(false)
    }
  }

  const handleCancel = () => {
    onCancel()
    onClose()
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && handleCancel()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Trophy className="h-5 w-5 text-gold-500" />
            Registrar Venda — {lead?.nome}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 py-2">
          {/* Tipo de Serviço */}
          <div className="grid gap-1.5">
            <Label>Tipo de Serviço *</Label>
            <Select onValueChange={(v) => setValue('tipoServico', v)}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione o serviço" />
              </SelectTrigger>
              <SelectContent>
                {TIPOS_SERVICO.map((t) => (
                  <SelectItem key={t} value={t}>{t}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.tipoServico && <p className="text-xs text-destructive">{errors.tipoServico.message}</p>}
          </div>

          {/* VGV Total */}
          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-1.5">
              <Label htmlFor="vgvTotal">VGV Total (R$) *</Label>
              <Input
                id="vgvTotal"
                type="number"
                step="0.01"
                min="0"
                placeholder="10000"
                {...register('vgvTotal', { valueAsNumber: true })}
              />
              {errors.vgvTotal && <p className="text-xs text-destructive">{errors.vgvTotal.message}</p>}
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="dataInicio">Data de Início *</Label>
              <Input id="dataInicio" type="date" {...register('dataInicio')} />
            </div>
          </div>

          {/* Tipo de Pagamento */}
          <div className="grid gap-1.5">
            <Label>Tipo de Pagamento *</Label>
            <div className="flex gap-2">
              {(['RECORRENTE', 'PARCELADO', 'AVULSO'] as const).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setValue('tipoPagamento', t)}
                  className={`flex-1 rounded-lg border px-3 py-2 text-xs font-medium transition-colors ${
                    tipoPagamento === t
                      ? 'border-gold-500 bg-gold-500/10 text-gold-500'
                      : 'border-surface-3 bg-surface-2 text-muted-foreground hover:border-gold-500/30'
                  }`}
                >
                  {t === 'RECORRENTE' ? 'Recorrente' : t === 'PARCELADO' ? 'Parcelado' : 'À Vista'}
                </button>
              ))}
            </div>
          </div>

          {/* Campos condicionais */}
          {tipoPagamento === 'RECORRENTE' && (
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-1.5">
                <Label htmlFor="recorrenciaMensal">Valor Mensal (R$)</Label>
                <Input
                  id="recorrenciaMensal"
                  type="number"
                  step="0.01"
                  min="0"
                  {...register('recorrenciaMensal', { valueAsNumber: true })}
                />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="diaVencimento">Dia de Vencimento</Label>
                <Input
                  id="diaVencimento"
                  type="number"
                  min="1"
                  max="28"
                  placeholder="10"
                  {...register('diaVencimento', { valueAsNumber: true })}
                />
              </div>
            </div>
          )}

          {tipoPagamento === 'PARCELADO' && (
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-1.5">
                <Label htmlFor="numeroParcelas">Nº de Parcelas</Label>
                <Input
                  id="numeroParcelas"
                  type="number"
                  min="1"
                  max="60"
                  {...register('numeroParcelas', { valueAsNumber: true })}
                />
              </div>
              <div className="grid gap-1.5">
                <Label>Valor por Parcela</Label>
                <div className="h-9 flex items-center px-3 rounded-md border border-surface-3 bg-surface-2 text-sm text-gold-500 font-medium">
                  {valorParcela ? `R$ ${valorParcela}` : '—'}
                </div>
              </div>
            </div>
          )}

          {tipoPagamento === 'AVULSO' && (
            <div className="grid gap-1.5">
              <Label htmlFor="dataVencimentoUnico">Data de Vencimento</Label>
              <Input id="dataVencimentoUnico" type="date" {...register('dataVencimentoUnico')} />
            </div>
          )}

          <DialogFooter className="pt-2">
            <Button type="button" variant="outline" onClick={handleCancel} disabled={saving}>
              Cancelar (volta ao funil)
            </Button>
            <Button type="submit" disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 animate-spin mr-1" />}
              Confirmar Venda
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
