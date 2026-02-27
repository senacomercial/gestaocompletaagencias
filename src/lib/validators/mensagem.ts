import { z } from 'zod'

export const criarMensagemSchema = z.object({
  organizacaoId: z.string().cuid(),
  telefoneContato: z.string().min(1),
  corpo: z.string().min(1),
  fromMe: z.boolean().default(false),
  whatsappId: z.string().min(1),
  timestamp: z.string().datetime().optional(),
  leadId: z.string().cuid().optional().nullable(),
})

export const marcarLidaSchema = z.object({
  leadId: z.string().cuid(),
})

export type CriarMensagemInput = z.infer<typeof criarMensagemSchema>
