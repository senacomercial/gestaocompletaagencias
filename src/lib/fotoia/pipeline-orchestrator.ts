import { StatusPedidoFoto } from '@prisma/client'
import { qualificarLead, enviarProposta } from './agents/vendedor'
import { gerarCobranca, confirmarPagamento } from './agents/cobrador'
import { gerarImagens } from './agents/produtor'
import { enviarParaAprovacao } from './agents/entregador'

/**
 * Mapa de transições automáticas do pipeline FotoIA.
 * Cada status define a ação que deve ocorrer quando o pedido entra nele.
 */
const PIPELINE_TRANSITIONS: Partial<Record<StatusPedidoFoto, (pedidoId: string) => Promise<void>>> = {
  NOVO_LEAD: (id) => qualificarLead(id),
  EM_QUALIFICACAO: (id) => enviarProposta(id),
  PROPOSTA_ENVIADA: null as unknown as (id: string) => Promise<void>, // aguarda resposta do lead
  FOLLOWUP_1: null as unknown as (id: string) => Promise<void>, // aguarda resposta
  FOLLOWUP_2: null as unknown as (id: string) => Promise<void>, // aguarda resposta
  AGUARDANDO_PAGAMENTO: (id) => gerarCobranca(id).catch(() => {}), // gera se não tem cobrança ainda
  PAGAMENTO_CONFIRMADO: (id) => gerarImagens(id),
  EM_PRODUCAO: null as unknown as (id: string) => Promise<void>, // aguarda webhook Replicate
  AGUARDANDO_APROVACAO: (id) => enviarParaAprovacao(id),
  EM_REVISAO: (id) => gerarImagens(id), // regera imagens
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
  const action = PIPELINE_TRANSITIONS[novoStatus]
  if (!action) return // sem ação automática para este status

  try {
    await action(pedidoId)
  } catch (error) {
    console.error(`[PipelineOrchestrator] Erro ao processar ${novoStatus} para pedido ${pedidoId}:`, error)
    // Não relançar — a falha é registrada na ExecucaoFotoIA pelo próprio agente
  }
}
