import { z } from 'zod'

export const createFunilSchema = z.object({
  nome: z.string().min(1, 'Nome obrigatório').max(80),
  descricao: z.string().max(300).optional().nullable(),
  ordem: z.number().int().min(0).optional(),
})

export const updateFunilSchema = createFunilSchema.partial()

export const createEtapaSchema = z.object({
  nome: z.string().min(1, 'Nome obrigatório').max(60),
  cor: z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Cor inválida (hex)').default('#D4AF37'),
  ordem: z.number().int().min(0).optional(),
  isVendaRealizada: z.boolean().optional(),
})

export const updateEtapaSchema = createEtapaSchema.partial()

export const reordenarEtapasSchema = z.object({
  etapaIds: z.array(z.string().cuid()).min(1),
})

export type CreateFunilInput = z.infer<typeof createFunilSchema>
export type UpdateFunilInput = z.infer<typeof updateFunilSchema>
export type CreateEtapaInput = z.infer<typeof createEtapaSchema>
export type UpdateEtapaInput = z.infer<typeof updateEtapaSchema>
export type ReordenarEtapasInput = z.infer<typeof reordenarEtapasSchema>
