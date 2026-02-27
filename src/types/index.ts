import type {
  Role,
  LeadStatus,
  TipoPagamento,
  StatusLancamento,
  TipoLancamento,
  StatusProjeto,
  StatusTarefa,
  StatusAgente,
  StatusExecucao,
  NivelLog,
} from '@prisma/client'

// Re-exporta enums do Prisma para uso nos componentes
export type {
  Role,
  LeadStatus,
  TipoPagamento,
  StatusLancamento,
  TipoLancamento,
  StatusProjeto,
  StatusTarefa,
  StatusAgente,
  StatusExecucao,
  NivelLog,
}

// =============================================================================
// Extensão do NextAuth session
// =============================================================================

declare module 'next-auth' {
  interface Session {
    user: {
      id: string
      name?: string | null
      email?: string | null
      image?: string | null
      role: string
      organizacaoId: string
      organizacaoSlug: string
      organizacaoNome: string
    }
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    id: string
    role: string
    organizacaoId: string
    organizacaoSlug: string
    organizacaoNome: string
  }
}

// =============================================================================
// DTOs / View Models
// =============================================================================

export interface LeadComDetalhes {
  id: string
  nome: string
  email?: string | null
  telefone?: string | null
  empresa?: string | null
  status: LeadStatus
  vgvTotal?: string | null
  recorrenciaMensal?: string | null
  dataConversao?: Date | null
  etapaId: string
  funilId: string
  createdAt: Date
  updatedAt: Date
  etapa: {
    id: string
    nome: string
    cor: string
    isVendaRealizada: boolean
  }
  tags: Array<{
    tag: {
      id: string
      nome: string
      cor: string
    }
  }>
}

export interface KanbanColuna {
  id: string
  nome: string
  cor: string
  isVendaRealizada: boolean
  ordem: number
  leads: LeadComDetalhes[]
}

export interface FunilComEtapas {
  id: string
  nome: string
  descricao?: string | null
  ordem: number
  etapas: KanbanColuna[]
}

export interface ProjetoComTarefas {
  id: string
  nome: string
  tipoServico: string
  status: StatusProjeto
  leadId: string
  lead: {
    nome: string
    empresa?: string | null
  }
  tarefas: TarefaComDetalhes[]
  sprints: SprintInfo[]
}

export interface TarefaComDetalhes {
  id: string
  titulo: string
  descricao?: string | null
  status: StatusTarefa
  prazo?: Date | null
  ordem: number
  sprintId?: string | null
  responsavel?: {
    id: string
    nome: string
  } | null
  detalhamentos: Array<{
    id: string
    conteudo: string
    createdAt: Date
    autor: {
      nome: string
    }
  }>
}

export interface SprintInfo {
  id: string
  nome: string
  dataInicio: Date
  dataFim: Date
}

export interface ContratoComLancamentos {
  id: string
  valorTotal: string
  recorrenciaMensal?: string | null
  tipoPagamento: TipoPagamento
  dataInicio: Date
  numeroParcelas?: number | null
  ativo: boolean
  motivoEncerramento?: string | null
  lancamentos: LancamentoInfo[]
}

export interface LancamentoInfo {
  id: string
  descricao: string
  valor: string
  dataVencimento: Date
  dataPagamento?: Date | null
  valorPago?: string | null
  status: StatusLancamento
  tipo: TipoLancamento
}

export interface SquadComAgentes {
  id: string
  nome: string
  descricao?: string | null
  avatar: string
  cor: string
  ativo: boolean
  agentes: AgenteInfo[]
}

export interface AgenteInfo {
  id: string
  nome: string
  role: string
  icone: string
  descricao?: string | null
  status: StatusAgente
  configuracao: Record<string, unknown>
}

// =============================================================================
// API Response types
// =============================================================================

export interface ApiResponse<T = unknown> {
  data?: T
  error?: string
  message?: string
}

export interface PaginatedResponse<T> {
  data: T[]
  total: number
  page: number
  pageSize: number
  totalPages: number
}

// =============================================================================
// Socket.io events
// =============================================================================

export interface SocketEvents {
  // WhatsApp
  'wa:qr': (data: { qr: string }) => void
  'wa:connected': (data: { telefone: string }) => void
  'wa:disconnected': () => void
  'wa:message': (data: MensagemSocket) => void

  // CRM
  'lead:moved': (data: { leadId: string; etapaId: string }) => void
  'lead:created': (data: { lead: LeadComDetalhes }) => void

  // Agentes
  'agente:status': (data: { agenteId: string; status: StatusAgente }) => void
  'execucao:log': (data: { execucaoId: string; nivel: NivelLog; mensagem: string }) => void
  'execucao:concluida': (data: { execucaoId: string; output: string }) => void
}

export interface MensagemSocket {
  id: string
  corpo: string
  fromMe: boolean
  timestamp: Date
  telefoneContato: string
  leadId?: string | null
  organizacaoId: string
}
