/**
 * Alert System — Story 8.7 AC: 4
 *
 * Detecta pedidos travados e emite alertas para o gestor
 * via banco de dados (a UI consulta via polling ou Socket.io).
 */

import { prisma } from '@/lib/prisma'

interface AlertaFotoIA {
  organizacaoId: string
  pedidoId: string
  tipo: 'producao_travada' | 'aprovacao_pendente' | 'pagamento_expirado' | 'erro_geracao'
  titulo: string
  descricao: string
}

/**
 * Verifica pedidos travados e gera alertas.
 * Chamado pelo cron job a cada hora.
 */
export async function verificarPedidosTravados(organizacaoId: string): Promise<AlertaFotoIA[]> {
  const agora = new Date()
  const alertas: AlertaFotoIA[] = []

  // ── Produção travada > 30 min ─────────────────────────────────────────
  const emProducaoTravados = await prisma.pedidoFotoIA.findMany({
    where: {
      organizacaoId,
      status: 'EM_PRODUCAO',
      updatedAt: { lt: new Date(agora.getTime() - 30 * 60 * 1000) },
    },
    select: { id: true, lead: { select: { nome: true } } },
    take: 10,
  })

  for (const p of emProducaoTravados) {
    alertas.push({
      organizacaoId,
      pedidoId: p.id,
      tipo: 'producao_travada',
      titulo: 'Produção travada',
      descricao: `Pedido de ${p.lead.nome} está em produção há mais de 30 minutos sem atualização.`,
    })
  }

  // ── Aprovação pendente > 2h ───────────────────────────────────────────
  const aguardandoAprovacao = await prisma.pedidoFotoIA.findMany({
    where: {
      organizacaoId,
      status: 'AGUARDANDO_APROVACAO',
      updatedAt: { lt: new Date(agora.getTime() - 2 * 60 * 60 * 1000) },
    },
    select: { id: true, lead: { select: { nome: true } } },
    take: 10,
  })

  for (const p of aguardandoAprovacao) {
    alertas.push({
      organizacaoId,
      pedidoId: p.id,
      tipo: 'aprovacao_pendente',
      titulo: 'Aprovação pendente há 2h',
      descricao: `O cliente ${p.lead.nome} não respondeu à galeria de aprovação.`,
    })
  }

  // ── Pagamento expirado > 24h ──────────────────────────────────────────
  const pagamentoExpirado = await prisma.pedidoFotoIA.findMany({
    where: {
      organizacaoId,
      status: 'AGUARDANDO_PAGAMENTO',
      updatedAt: { lt: new Date(agora.getTime() - 24 * 60 * 60 * 1000) },
    },
    select: { id: true, lead: { select: { nome: true } } },
    take: 10,
  })

  for (const p of pagamentoExpirado) {
    alertas.push({
      organizacaoId,
      pedidoId: p.id,
      tipo: 'pagamento_expirado',
      titulo: 'Pagamento expirado',
      descricao: `Link de pagamento de ${p.lead.nome} enviado há mais de 24h sem confirmação.`,
    })
  }

  return alertas
}

/**
 * Retry automático para falhas de geração — Story 8.7 AC: 6
 * Chamado quando o webhook Replicate retorna status "failed".
 */
export async function handleGeracaoFalha(pedidoId: string): Promise<'retry' | 'failed'> {
  const pedido = await prisma.pedidoFotoIA.findUnique({
    where: { id: pedidoId },
    select: { tentativasGeracao: true, organizacaoId: true, lead: { select: { nome: true } } },
  })

  if (!pedido) return 'failed'

  const maxTentativas = 3

  if (pedido.tentativasGeracao < maxTentativas) {
    // Retry: resetar para PAGAMENTO_CONFIRMADO para reativar o produtor
    await prisma.pedidoFotoIA.update({
      where: { id: pedidoId },
      data: {
        status: 'PAGAMENTO_CONFIRMADO',
        predictionId: null,
        tentativasGeracao: { increment: 1 },
      },
    })

    await prisma.execucaoFotoIA.create({
      data: {
        pedidoId,
        etapa: 'retry-geracao',
        status: 'iniciado',
        saida: { tentativa: pedido.tentativasGeracao + 1, maxTentativas },
      },
    })

    // Re-trigger via pipeline (import dinâmico para evitar circular)
    const { onStatusChange } = await import('./pipeline-orchestrator')
    await onStatusChange(pedidoId, 'PAGAMENTO_CONFIRMADO' as never)

    return 'retry'
  } else {
    // Max tentativas atingido
    await prisma.pedidoFotoIA.update({
      where: { id: pedidoId },
      data: { status: 'CANCELADO' },
    })

    await prisma.execucaoFotoIA.create({
      data: {
        pedidoId,
        etapa: 'geracao-falhou',
        status: 'erro',
        saida: { motivo: `Max de ${maxTentativas} tentativas atingido`, lead: pedido.lead.nome },
      },
    })

    return 'failed'
  }
}
