import { prisma } from '@/lib/prisma'
import { StatusPedidoFoto } from '@prisma/client'
import { createPixCharge } from '@/lib/fotoia/payment/mercadopago'

/**
 * Agente Cobrador IA — Geração de cobrança PIX e acompanhamento de pagamento
 * Responsável por: PROPOSTA_ENVIADA → AGUARDANDO_PAGAMENTO → PAGAMENTO_CONFIRMADO
 */
export async function gerarCobranca(pedidoId: string): Promise<void> {
  const pedido = await prisma.pedidoFotoIA.findUnique({
    where: { id: pedidoId },
    include: { lead: true },
  })
  if (!pedido) throw new Error(`Pedido ${pedidoId} não encontrado`)

  // Não gerar nova cobrança se já existe uma pendente
  if (pedido.cobrancaId && pedido.status === StatusPedidoFoto.AGUARDANDO_PAGAMENTO) {
    return
  }

  await registrarExecucao(pedidoId, 'gerar-cobranca', 'iniciado', {})

  try {
    const charge = await createPixCharge({
      customerName: pedido.lead.nome,
      customerEmail: pedido.lead.email ?? `lead-${pedido.lead.id}@fotoia.local`,
      value: Number(pedido.valorCobrado ?? 97),
      description: `FotoIA - ${pedido.tipoFoto.replace(/_/g, ' ')}`,
      idempotencyKey: `fotoia-${pedidoId}`,
    })

    await prisma.pedidoFotoIA.update({
      where: { id: pedidoId },
      data: {
        status: StatusPedidoFoto.AGUARDANDO_PAGAMENTO,
        cobrancaId: charge.chargeId,
        linkPagamento: charge.pixQrCode, // armazena o copia-e-cola PIX
        observacoes: charge.pixQrCodeBase64
          ? `pix_qrcode_base64:${charge.pixQrCodeBase64}`
          : undefined,
      },
    })

    await registrarExecucao(pedidoId, 'gerar-cobranca', 'concluido', {
      novoStatus: 'AGUARDANDO_PAGAMENTO',
      chargeId: charge.chargeId,
      pixGerado: true,
    })
  } catch (error) {
    await registrarExecucao(pedidoId, 'gerar-cobranca', 'erro', {
      erro: String(error),
    })
    throw error
  }
}

export async function confirmarPagamento(pedidoId: string): Promise<void> {
  await registrarExecucao(pedidoId, 'confirmar-pagamento', 'iniciado', {})

  await prisma.pedidoFotoIA.update({
    where: { id: pedidoId },
    data: { status: StatusPedidoFoto.PAGAMENTO_CONFIRMADO },
  })

  await registrarExecucao(pedidoId, 'confirmar-pagamento', 'concluido', {
    novoStatus: 'PAGAMENTO_CONFIRMADO',
  })
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
