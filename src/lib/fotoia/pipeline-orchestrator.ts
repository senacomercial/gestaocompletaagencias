import { StatusPedidoFoto } from '@prisma/client'
import { qualificarLead, enviarProposta } from './agents/vendedor'
import { gerarCobranca, confirmarPagamento } from './agents/cobrador'
import { coletarRequisitos, gerarImagens } from './agents/produtor'
import { enviarParaAprovacao } from './agents/entregador'
import { prisma } from '@/lib/prisma'

const SOCKET_URL = process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:3001'

async function emitirStatusUpdate(organizacaoId: string, pedidoId: string, novoStatus: StatusPedidoFoto) {
  try {
    await fetch(`${SOCKET_URL}/emit`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ organizacaoId, event: 'pedido:status-update', data: { pedidoId, novoStatus } }),
    })
  } catch (_) {
    // socket server offline — não bloquear pipeline
  }
}

/**
 * Mapa de transições automáticas do pipeline FotoIA.
 * Cada status define a ação que deve ocorrer quando o pedido entra nele.
 */
const PIPELINE_TRANSITIONS: Partial<Record<StatusPedidoFoto, (pedidoId: string) => Promise<void>>> = {
  NOVO_LEAD: (id) => qualificarLead(id),
  EM_QUALIFICACAO: (id) => enviarProposta(id),
  PROPOSTA_ENVIADA: null as unknown as (id: string) => Promise<void>, // aguarda escolha do pacote via WhatsApp
  FOLLOWUP_1: null as unknown as (id: string) => Promise<void>, // aguarda resposta
  FOLLOWUP_2: null as unknown as (id: string) => Promise<void>, // aguarda resposta
  AGUARDANDO_PAGAMENTO: null as unknown as (id: string) => Promise<void>, // aguarda comprovante via WhatsApp
  PAGAMENTO_CONFIRMADO: (id) => coletarRequisitos(id), // pede tema e foto do cliente
  COLETANDO_REQUISITOS: null as unknown as (id: string) => Promise<void>, // bot-handler processa respostas
  EM_PRODUCAO: null as unknown as (id: string) => Promise<void>, // aguarda webhook Replicate
  AGUARDANDO_APROVACAO: (id) => enviarParaAprovacao(id), // avalia qualidade + envia via WhatsApp
  EM_REVISAO: (id) => gerarImagens(id), // regera imagens com observações
  ENTREGUE: null as unknown as (id: string) => Promise<void>,
  CANCELADO: null as unknown as (id: string) => Promise<void>,
  PERDIDO: null as unknown as (id: string) => Promise<void>,
}

/**
 * Aciona a ação automática correspondente a um status.
 * Chamado após qualquer mudança de status no pipeline.
 */
export async function onStatusChange(
  pedidoId: string,
  novoStatus: StatusPedidoFoto,
): Promise<void> {
  // Emitir evento real-time antes da ação para atualizar dashboard imediatamente
  try {
    const pedido = await prisma.pedidoFotoIA.findUnique({ where: { id: pedidoId }, select: { organizacaoId: true } })
    if (pedido) {
      await emitirStatusUpdate(pedido.organizacaoId, pedidoId, novoStatus)
    }
  } catch (_) {}

  const action = PIPELINE_TRANSITIONS[novoStatus]
  if (!action) return // sem ação automática para este status

  try {
    await action(pedidoId)
  } catch (error) {
    console.error(`[PipelineOrchestrator] Erro ao processar ${novoStatus} para pedido ${pedidoId}:`, error)
    // Não relançar — a falha é registrada na ExecucaoFotoIA pelo próprio agente
  }
}
