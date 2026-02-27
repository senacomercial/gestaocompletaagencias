import { z } from 'zod'

export const createProjetoSchema = z.object({
  nome: z.string().min(1),
  tipoServico: z.string().min(1),
  leadId: z.string().cuid(),
})

export const updateProjetoSchema = z.object({
  nome: z.string().min(1).optional(),
  tipoServico: z.string().optional(),
  status: z.enum(['ATIVO', 'PAUSADO', 'CONCLUIDO', 'CANCELADO']).optional(),
})

export const createSprintSchema = z.object({
  nome: z.string().min(1),
  dataInicio: z.string().datetime(),
  dataFim: z.string().datetime(),
})

export const createTarefaSchema = z.object({
  titulo: z.string().min(1),
  descricao: z.string().optional().nullable(),
  prazo: z.string().datetime().optional().nullable(),
  sprintId: z.string().cuid().optional().nullable(),
  responsavelId: z.string().cuid().optional().nullable(),
  ordem: z.number().int().default(0),
})

export const updateTarefaSchema = z.object({
  titulo: z.string().min(1).optional(),
  descricao: z.string().optional().nullable(),
  status: z.enum(['PENDENTE', 'EM_ANDAMENTO', 'CONCLUIDA', 'BLOQUEADA']).optional(),
  prazo: z.string().datetime().optional().nullable(),
  sprintId: z.string().cuid().optional().nullable(),
  responsavelId: z.string().cuid().optional().nullable(),
  ordem: z.number().int().optional(),
})

export const createDetalhamentoSchema = z.object({
  conteudo: z.string().min(1),
})

export const createPresetSchema = z.object({
  nome: z.string().min(1),
  tarefas: z.array(z.object({
    titulo: z.string().min(1),
    descricao: z.string().optional().nullable(),
    ordemPadrao: z.number().int().default(0),
  })).default([]),
})

export const aplicarPresetSchema = z.object({
  presetId: z.string().cuid(),
  tarefaIds: z.array(z.string().cuid()).optional(),
})
