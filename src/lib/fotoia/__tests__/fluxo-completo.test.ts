/**
 * Teste de fluxo completo FotoIA — Story 8.2 AC: 8
 *
 * Mocka: WhatsApp (não envia), Gateway PIX (simula confirmação),
 *        Replicate (retorna imagem de teste), Prisma (in-memory via jest.mock)
 *
 * Execução: npx jest src/lib/fotoia/__tests__/fluxo-completo.test.ts
 */

import { jest } from '@jest/globals'

// ── Mocks ──────────────────────────────────────────────────────────────────

// Mock WhatsApp sender
jest.mock('@/lib/fotoia/whatsapp/wa-sender', () => ({
  enviarTexto:   jest.fn().mockResolvedValue(undefined),
  enviarImagens: jest.fn().mockResolvedValue(undefined),
}))

// Mock Replicate (fetch)
const mockFetch = jest.fn()
global.fetch = mockFetch

// Mock Anthropic (quality check)
jest.mock('@anthropic-ai/sdk', () => ({
  default: jest.fn().mockImplementation(() => ({
    messages: {
      create: jest.fn().mockResolvedValue({
        content: [{ type: 'text', text: 'SIM' }],
      }),
    },
  })),
}))

// Mock PIX config
jest.mock('@/lib/fotoia/payment/pix-manual', () => ({
  getPixConfig: () => ({
    chave: 'pix@teste.com',
    tipo: 'email',
    nome: 'Agência Teste',
  }),
  validarComprovanteComIA: jest.fn().mockResolvedValue({
    valido: true,
    motivo: 'Comprovante válido (mock)',
  }),
}))

// Mock Prisma
const PEDIDO_ID = 'pedido-teste-001'
const ORG_ID    = 'org-teste-001'
const LEAD_ID   = 'lead-teste-001'

let pedidoState: Record<string, unknown> = {}
let execucoes: unknown[] = []
let imagens: unknown[] = []

const mockPrisma = {
  pedidoFotoIA: {
    findUnique: jest.fn().mockImplementation(({ where }: { where: { id: string } }) => {
      if (where.id !== PEDIDO_ID) return null
      return Promise.resolve({
        id: PEDIDO_ID,
        organizacaoId: ORG_ID,
        status: pedidoState.status ?? 'NOVO_LEAD',
        pacote: pedidoState.pacote ?? null,
        valorCobrado: pedidoState.valorCobrado ?? null,
        revisoesMaximas: pedidoState.revisoesMaximas ?? 4,
        rodadasRevisao: pedidoState.rodadasRevisao ?? 0,
        cobrancaId: pedidoState.cobrancaId ?? null,
        linkPagamento: pedidoState.linkPagamento ?? null,
        predictionId: pedidoState.predictionId ?? null,
        temaFoto: pedidoState.temaFoto ?? null,
        fotoClienteUrl: pedidoState.fotoClienteUrl ?? null,
        descricao: null,
        observacoes: null,
        lead: {
          id: LEAD_ID,
          nome: 'João Silva',
          telefone: '5511999990001',
        },
        organizacao: { id: ORG_ID, nome: 'Agência Teste' },
        imagens,
        ...pedidoState,
      })
    }),
    update: jest.fn().mockImplementation(({ data }: { data: Record<string, unknown> }) => {
      pedidoState = { ...pedidoState, ...data }
      return Promise.resolve({ id: PEDIDO_ID, ...pedidoState })
    }),
    count: jest.fn().mockResolvedValue(0),
  },
  fotoIAConfig: {
    findUnique: jest.fn().mockResolvedValue({ maxSimultaneos: 3 }),
  },
  execucaoFotoIA: {
    create: jest.fn().mockImplementation(({ data }: { data: unknown }) => {
      execucoes.push(data)
      return Promise.resolve(data)
    }),
  },
  geracaoQueue: {
    upsert: jest.fn().mockResolvedValue({}),
  },
}

jest.mock('@/lib/prisma', () => ({ prisma: mockPrisma }))

// ── Importar após mocks ────────────────────────────────────────────────────

import { qualificarLead, executarFollowUp }       from '../agents/vendedor'
import { gerarCobranca, confirmarPagamento }       from '../agents/cobrador'
import { coletarRequisitos, gerarImagens }         from '../agents/produtor'
import { avaliarQualidadeEEnviar }                 from '../agents/entregador'
import { handlePedidoStatusChange }                from '../squad-orchestrator'
import { enviarTexto }                             from '@/lib/fotoia/whatsapp/wa-sender'

// ── Helpers ────────────────────────────────────────────────────────────────

function resetState(overrides: Record<string, unknown> = {}) {
  pedidoState = { status: 'NOVO_LEAD', ...overrides }
  execucoes   = []
  imagens     = []
  jest.clearAllMocks()

  // Re-mock Replicate fetch
  mockFetch.mockResolvedValue({
    ok: true,
    json: () => Promise.resolve({ id: 'pred-mock-001' }),
    text: () => Promise.resolve(''),
  } as unknown as Response)
}

// ── Testes ─────────────────────────────────────────────────────────────────

describe('FotoIA — Fluxo Completo (mockado)', () => {

  describe('Etapa 1: Qualificação (Vendedor)', () => {
    beforeEach(() => resetState())

    it('qualificarLead: muda status para EM_QUALIFICACAO e envia boas-vindas via WA', async () => {
      await qualificarLead(PEDIDO_ID)

      expect(mockPrisma.pedidoFotoIA.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ status: 'EM_QUALIFICACAO' }) }),
      )
      expect(enviarTexto).toHaveBeenCalledWith(ORG_ID, '5511999990001', expect.stringContaining('FotoIA'))
    })

    it('executarFollowUp rodada 1: envia mensagem de acompanhamento', async () => {
      resetState({ status: 'PROPOSTA_ENVIADA' })
      await executarFollowUp(PEDIDO_ID, 1)

      expect(mockPrisma.pedidoFotoIA.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ status: 'FOLLOWUP_1' }) }),
      )
      expect(enviarTexto).toHaveBeenCalled()
    })

    it('executarFollowUp rodada 2: envia mensagem de última chamada', async () => {
      resetState({ status: 'FOLLOWUP_1' })
      await executarFollowUp(PEDIDO_ID, 2)

      expect(mockPrisma.pedidoFotoIA.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ status: 'FOLLOWUP_2' }) }),
      )
    })
  })

  describe('Etapa 2: Cobrança PIX (Cobrador)', () => {
    beforeEach(() => resetState({ status: 'PROPOSTA_ENVIADA', pacote: 'PROFISSIONAL', valorCobrado: 47 }))

    it('gerarCobranca: envia chave PIX via WA e muda status para AGUARDANDO_PAGAMENTO', async () => {
      await gerarCobranca(PEDIDO_ID)

      expect(enviarTexto).toHaveBeenCalledWith(ORG_ID, '5511999990001', expect.stringContaining('PIX'))
      expect(mockPrisma.pedidoFotoIA.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ status: 'AGUARDANDO_PAGAMENTO' }) }),
      )
    })

    it('confirmarPagamento: muda status para PAGAMENTO_CONFIRMADO', async () => {
      await confirmarPagamento(PEDIDO_ID)

      expect(mockPrisma.pedidoFotoIA.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ status: 'PAGAMENTO_CONFIRMADO' }) }),
      )
    })
  })

  describe('Etapa 3: Coleta de requisitos (Produtor)', () => {
    beforeEach(() => resetState({ status: 'PAGAMENTO_CONFIRMADO', pacote: 'PROFISSIONAL' }))

    it('coletarRequisitos: muda status para COLETANDO_REQUISITOS e pede tema via WA', async () => {
      await coletarRequisitos(PEDIDO_ID)

      expect(mockPrisma.pedidoFotoIA.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ status: 'COLETANDO_REQUISITOS' }) }),
      )
      expect(enviarTexto).toHaveBeenCalledWith(ORG_ID, '5511999990001', expect.stringContaining('tema'))
    })
  })

  describe('Etapa 4: Geração de imagens (Produtor)', () => {
    beforeEach(() => resetState({
      status: 'EM_PRODUCAO',
      pacote: 'PROFISSIONAL',
      temaFoto: 'profissional',
      fotoClienteUrl: '/uploads/foto-ia/clientes/pedido-teste-001/rosto.jpg',
    }))

    it('gerarImagens: chama Replicate e salva predictionId', async () => {
      process.env.REPLICATE_API_TOKEN = 'r8_test'
      process.env.NEXT_PUBLIC_APP_URL = 'http://localhost:3000'

      await gerarImagens(PEDIDO_ID)

      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.replicate.com/v1/predictions',
        expect.objectContaining({ method: 'POST' }),
      )
      expect(mockPrisma.pedidoFotoIA.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ predictionId: 'pred-mock-001' }),
        }),
      )
    })
  })

  describe('Etapa 5: Entrega e aprovação (Entregador)', () => {
    beforeEach(() => {
      imagens = [
        { id: 'img-1', url: 'http://cdn.test/img1.jpg', tipo: 'gerada', aprovada: false, criadoEm: new Date() },
        { id: 'img-2', url: 'http://cdn.test/img2.jpg', tipo: 'gerada', aprovada: false, criadoEm: new Date() },
      ]
      resetState({ status: 'AGUARDANDO_APROVACAO', revisoesMaximas: 4, rodadasRevisao: 0, pacote: 'PROFISSIONAL' })
    })

    it('avaliarQualidadeEEnviar: envia imagens via WA e muda status para AGUARDANDO_APROVACAO', async () => {
      await avaliarQualidadeEEnviar(PEDIDO_ID)

      expect(enviarTexto).toHaveBeenCalled()
      expect(mockPrisma.pedidoFotoIA.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ status: 'AGUARDANDO_APROVACAO' }) }),
      )
    })
  })

  describe('Orquestrador (handlePedidoStatusChange)', () => {
    beforeEach(() => resetState())

    it('NOVO_LEAD → dispara qualificarLead (chama WA)', async () => {
      await handlePedidoStatusChange(PEDIDO_ID, 'NOVO_LEAD' as never)
      expect(enviarTexto).toHaveBeenCalled()
    })

    it('Status sem ação (CANCELADO) → não chama WA', async () => {
      await handlePedidoStatusChange(PEDIDO_ID, 'CANCELADO' as never)
      expect(enviarTexto).not.toHaveBeenCalled()
    })
  })

  describe('Logs de execução (ExecucaoFotoIA)', () => {
    beforeEach(() => resetState())

    it('qualificarLead registra ao menos 1 execução em ExecucaoFotoIA', async () => {
      await qualificarLead(PEDIDO_ID)
      expect(execucoes.length).toBeGreaterThanOrEqual(1)
    })

    it('gerarCobranca registra execução com etapa "gerar-cobranca"', async () => {
      resetState({ status: 'PROPOSTA_ENVIADA', pacote: 'PROFISSIONAL', valorCobrado: 47 })
      await gerarCobranca(PEDIDO_ID)
      const log = execucoes.find((e: unknown) => (e as { etapa: string }).etapa === 'gerar-cobranca')
      expect(log).toBeDefined()
    })
  })
})
