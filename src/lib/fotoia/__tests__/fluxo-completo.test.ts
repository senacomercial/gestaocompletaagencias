/**
 * Teste de fluxo completo FotoIA — Story 8.2 AC: 8
 *
 * Mocka: WhatsApp (não envia), Gateway PIX (simula confirmação),
 *        Replicate (retorna imagem de teste), Prisma (in-memory via vi.mock)
 *
 * Execução: npx vitest run src/lib/fotoia/__tests__/fluxo-completo.test.ts
 */

import { vi } from 'vitest'

// ── Mocks ──────────────────────────────────────────────────────────────────

// Mock WhatsApp sender
vi.mock('@/lib/fotoia/whatsapp/wa-sender', () => ({
  enviarTexto:   vi.fn().mockResolvedValue(undefined),
  enviarImagens: vi.fn().mockResolvedValue(undefined),
}))

// Mock Replicate (fetch)
const mockFetch = vi.fn()
global.fetch = mockFetch

// Mock Anthropic (quality check)
vi.mock('@anthropic-ai/sdk', () => ({
  default: vi.fn().mockImplementation(() => ({
    messages: {
      create: vi.fn().mockResolvedValue({
        content: [{ type: 'text', text: 'SIM' }],
      }),
    },
  })),
}))

// Mock PIX config
vi.mock('@/lib/fotoia/payment/pix-manual', () => ({
  getPixConfig: () => ({
    chave: 'pix@teste.com',
    tipo: 'email',
    nome: 'Agência Teste',
  }),
  validarComprovanteComIA: vi.fn().mockResolvedValue({
    valido: true,
    motivo: 'Comprovante válido (mock)',
  }),
}))

// Mock Prisma
const { PEDIDO_ID, ORG_ID, LEAD_ID, s, mockPrisma } = vi.hoisted(() => {
const PEDIDO_ID = 'pedido-teste-001'
const ORG_ID    = 'org-teste-001'
const LEAD_ID   = 'lead-teste-001'
const s = {
  pedidoState: {} as Record<string, unknown>,
  execucoes: [] as unknown[],
  imagens: [] as unknown[],
}
const mockPrisma = {
  pedidoFotoIA: {
    findUnique: vi.fn().mockImplementation(({ where }: { where: { id: string } }) => {
      if (where.id !== PEDIDO_ID) return null
      return Promise.resolve({
        id: PEDIDO_ID,
        organizacaoId: ORG_ID,
        status: s.pedidoState.status ?? 'NOVO_LEAD',
        pacote: s.pedidoState.pacote ?? null,
        valorCobrado: s.pedidoState.valorCobrado ?? null,
        revisoesMaximas: s.pedidoState.revisoesMaximas ?? 4,
        rodadasRevisao: s.pedidoState.rodadasRevisao ?? 0,
        cobrancaId: s.pedidoState.cobrancaId ?? null,
        linkPagamento: s.pedidoState.linkPagamento ?? null,
        predictionId: s.pedidoState.predictionId ?? null,
        temaFoto: s.pedidoState.temaFoto ?? null,
        fotoClienteUrl: s.pedidoState.fotoClienteUrl ?? null,
        descricao: null,
        observacoes: null,
        lead: {
          id: LEAD_ID,
          nome: 'João Silva',
          telefone: '5511999990001',
        },
        organizacao: { id: ORG_ID, nome: 'Agência Teste' },
        imagens: s.imagens,
        ...s.pedidoState,
      })
    }),
    update: vi.fn().mockImplementation(({ data }: { data: Record<string, unknown> }) => {
      s.pedidoState = { ...s.pedidoState, ...data }
      return Promise.resolve({ id: PEDIDO_ID, ...s.pedidoState })
    }),
    count: vi.fn().mockResolvedValue(0),
  },
  fotoIAConfig: {
    findUnique: vi.fn().mockResolvedValue({ maxSimultaneos: 3 }),
  },
  execucaoFotoIA: {
    create: vi.fn().mockImplementation(({ data }: { data: unknown }) => {
      s.execucoes.push(data)
      return Promise.resolve(data)
    }),
  },
  geracaoQueue: {
    upsert: vi.fn().mockResolvedValue({}),
  },
}

return { PEDIDO_ID, ORG_ID, LEAD_ID, s, mockPrisma }
})

vi.mock('@/lib/prisma', () => ({ prisma: mockPrisma }))

// ── Importar após mocks ────────────────────────────────────────────────────

import { qualificarLead, executarFollowUp }       from '../agents/vendedor'
import { gerarCobranca, confirmarPagamento }       from '../agents/cobrador'
import { coletarRequisitos, gerarImagens }         from '../agents/produtor'
import { avaliarQualidadeEEnviar }                 from '../agents/entregador'
import { handlePedidoStatusChange }                from '../squad-orchestrator'
import { enviarTexto }                             from '@/lib/fotoia/whatsapp/wa-sender'

// ── Helpers ────────────────────────────────────────────────────────────────

function resetState(overrides: Record<string, unknown> = {}) {
  s.pedidoState = { status: 'NOVO_LEAD', ...overrides }
  s.execucoes   = []
  s.imagens     = []
  vi.clearAllMocks()

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
      resetState({ status: 'AGUARDANDO_APROVACAO', revisoesMaximas: 4, rodadasRevisao: 0, pacote: 'PROFISSIONAL' })
      s.imagens = [
        { id: 'img-1', url: 'http://cdn.test/img1.jpg', tipo: 'gerada', aprovada: false, criadoEm: new Date() },
        { id: 'img-2', url: 'http://cdn.test/img2.jpg', tipo: 'gerada', aprovada: false, criadoEm: new Date() },
      ]
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
      expect(s.execucoes.length).toBeGreaterThanOrEqual(1)
    })

    it('gerarCobranca registra execução com etapa "gerar-cobranca"', async () => {
      resetState({ status: 'PROPOSTA_ENVIADA', pacote: 'PROFISSIONAL', valorCobrado: 47 })
      await gerarCobranca(PEDIDO_ID)
      const log = s.execucoes.find((e: unknown) => (e as { etapa: string }).etapa === 'gerar-cobranca')
      expect(log).toBeDefined()
    })
  })
})
