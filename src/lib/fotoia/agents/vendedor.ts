import { prisma } from '@/lib/prisma'
import { StatusPedidoFoto } from '@prisma/client'

/**
 * Agente Vendedor IA — Qualificação e proposta comercial
 * Responsável por: NOVO_LEAD → EM_QUALIFICACAO → PROPOSTA_ENVIADA
 */
export async function qualificarLead(pedidoId: string): Promise<void> {
  const pedido = await prisma.pedidoFotoIA.findUnique({
    where: { id: pedidoId },
    include: { lead: true, organizacao: true },
  })
  if (!pedido) throw new Error(`Pedido ${pedidoId} não encontrado`)

  await registrarExecucao(pedidoId, 'qualificar-lead', 'iniciado', { status: pedido.status })

  const config = await getConfig(pedido.organizacaoId)
  const precos = config?.precos as Record<string, { preco: number; qtdImagens: number }> ?? {}
  const tipoConfig = precos[pedido.tipoFoto] ?? { preco: 97, qtdImagens: 5 }

  // Atualizar pedido com valor e mover para EM_QUALIFICACAO
  await prisma.pedidoFotoIA.update({
    where: { id: pedidoId },
    data: {
      status: StatusPedidoFoto.EM_QUALIFICACAO,
      valorCobrado: tipoConfig.preco,
    },
  })

  await registrarExecucao(pedidoId, 'qualificar-lead', 'concluido', {
    novoStatus: 'EM_QUALIFICACAO',
    valorDefinido: tipoConfig.preco,
  })
}

export async function enviarProposta(pedidoId: string): Promise<void> {
  const pedido = await prisma.pedidoFotoIA.findUnique({
    where: { id: pedidoId },
    include: { lead: true },
  })
  if (!pedido) throw new Error(`Pedido ${pedidoId} não encontrado`)

  await registrarExecucao(pedidoId, 'enviar-proposta', 'iniciado', {})

  await prisma.pedidoFotoIA.update({
    where: { id: pedidoId },
    data: { status: StatusPedidoFoto.PROPOSTA_ENVIADA },
  })

  await registrarExecucao(pedidoId, 'enviar-proposta', 'concluido', {
    novoStatus: 'PROPOSTA_ENVIADA',
    leadTelefone: pedido.lead.telefone,
  })
}

export async function executarFollowUp(pedidoId: string, rodada: 1 | 2): Promise<void> {
  const novoStatus = rodada === 1 ? StatusPedidoFoto.FOLLOWUP_1 : StatusPedidoFoto.FOLLOWUP_2

  await registrarExecucao(pedidoId, `followup-${rodada}`, 'iniciado', { rodada })
  await prisma.pedidoFotoIA.update({ where: { id: pedidoId }, data: { status: novoStatus } })
  await registrarExecucao(pedidoId, `followup-${rodada}`, 'concluido', { novoStatus })
}

async function getConfig(organizacaoId: string) {
  return prisma.fotoIAConfig.findUnique({ where: { organizacaoId } })
}

async function registrarExecucao(
  pedidoId: string,
  etapa: string,
  status: 'iniciado' | 'concluido' | 'erro',
  dados: Record<string, unknown>,
) {
  await prisma.execucaoFotoIA.create({
    data: { pedidoId, etapa, status, saida: dados as object },
  })
}
