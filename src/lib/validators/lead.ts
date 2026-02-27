import { z } from 'zod'

export const createLeadSchema = z.object({
  nome: z.string().min(1, 'Nome obrigatório').max(100),
  email: z.string().email('Email inválido').optional().or(z.literal('')).transform(v => v || null),
  telefone: z.string().max(20).optional().or(z.literal('')).transform(v => v || null),
  empresa: z.string().max(100).optional().or(z.literal('')).transform(v => v || null),
  etapaId: z.string().cuid('Etapa inválida'),
  funilId: z.string().cuid('Funil inválido'),
})

export const updateLeadSchema = z.object({
  nome: z.string().min(1).max(100).optional(),
  email: z.string().email().optional().nullable(),
  telefone: z.string().max(20).optional().nullable(),
  empresa: z.string().max(100).optional().nullable(),
  etapaId: z.string().cuid().optional(),
  funilId: z.string().cuid().optional(),
  vgvTotal: z.number().min(0).optional().nullable(),
  recorrenciaMensal: z.number().min(0).optional().nullable(),
})

export const moverEtapaSchema = z.object({
  etapaId: z.string().cuid('Etapa inválida'),
  funilId: z.string().cuid('Funil inválido'),
})

export type CreateLeadInput = z.infer<typeof createLeadSchema>
export type UpdateLeadInput = z.infer<typeof updateLeadSchema>
export type MoverEtapaInput = z.infer<typeof moverEtapaSchema>
