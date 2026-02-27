import { z } from 'zod'

export const createTagSchema = z.object({
  nome: z.string().min(1, 'Nome obrigatório').max(40),
  cor: z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Cor inválida (hex)').default('#D4AF37'),
})

export const updateTagSchema = createTagSchema.partial()

export type CreateTagInput = z.infer<typeof createTagSchema>
export type UpdateTagInput = z.infer<typeof updateTagSchema>
