import { z } from 'zod'

export const conversaoSchema = z.object({
  leadId: z.string().cuid(),
  etapaId: z.string().cuid(),
  vgvTotal: z.number().positive('VGV deve ser positivo'),
  tipoPagamento: z.enum(['RECORRENTE', 'PARCELADO', 'AVULSO']),
  tipoServico: z.string().min(1, 'Tipo de serviço obrigatório'),
  dataInicio: z.string().datetime(),
  recorrenciaMensal: z.number().positive().optional(),
  diaVencimento: z.number().int().min(1).max(28).optional(),
  numeroParcelas: z.number().int().positive().optional(),
  dataVencimentoUnico: z.string().datetime().optional(),
})

export type ConversaoInput = z.infer<typeof conversaoSchema>
