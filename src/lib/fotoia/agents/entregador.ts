import { prisma } from '@/lib/prisma'
import { StatusPedidoFoto } from '@prisma/client'
import jwt from 'jsonwebtoken'

/**
 * Agente Entregador IA — Envio para aprovação e entrega final
 * Responsável por: EM_PRODUCAO → AGUARDANDO_APROVACAO → ENTREGUE
 */
export async function enviarParaAprovacao(pedidoId: string): Promise<void> {
  const pedido = await prisma.pedidoFotoIA.findUnique({
    where: { id: pedidoId },
    include: { lead: true, imagens: { where: { tipo: 'gerada' } } },
  })
  if (!pedido) throw new Error(`Pedido ${pedidoId} não encontrado`)

  await registrarExecucao(pedidoId, 'enviar-aprovacao', 'iniciado', {})

  // Gerar token JWT para galeria pública
  const secret = process.env.NEXTAUTH_SECRET ?? 'fotoia-secret'
  const tokenGaleria = jwt.sign({ pedidoId }, secret, { expiresIn: '7d' })

  await prisma.pedidoFotoIA.update({
    where: { id: pedidoId },
    data: {
      status: StatusPedidoFoto.AGUARDANDO_APROVACAO,
      tokenGaleria,
    },
  })

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? process.env.NEXTAUTH_URL ?? 'http://localhost:3000'
  const galeriaUrl = `${appUrl}/galeria/${tokenGaleria}`

  await registrarExecucao(pedidoId, 'enviar-aprovacao', 'concluido', {
    novoStatus: 'AGUARDANDO_APROVACAO',
    galeriaUrl,
    qtdImagens: pedido.imagens.length,
  })
}

export async function processarAprovacao(
  pedidoId: string,
  aprovado: boolean,
  observacoes?: string,
): Promise<void> {
  const pedido = await prisma.pedidoFotoIA.findUnique({ where: { id: pedidoId } })
  if (!pedido) throw new Error(`Pedido ${pedidoId} não encontrado`)

  await registrarExecucao(pedidoId, 'processar-aprovacao', 'iniciado', { aprovado })

  if (aprovado) {
    await prisma.$transaction([
      prisma.pedidoFotoIA.update({
        where: { id: pedidoId },
        data: {
          status: StatusPedidoFoto.ENTREGUE,
          aprovadoEm: new Date(),
          entregueEm: new Date(),
          observacoes: observacoes ?? pedido.observacoes,
        },
      }),
      prisma.imagemFotoIA.updateMany({
        where: { pedidoId },
        data: { aprovada: true },
      }),
    ])

    await registrarExecucao(pedidoId, 'processar-aprovacao', 'concluido', {
      novoStatus: 'ENTREGUE',
    })
  } else {
    await prisma.pedidoFotoIA.update({
      where: { id: pedidoId },
      data: {
        status: StatusPedidoFoto.EM_REVISAO,
        rodadasRevisao: { increment: 1 },
        observacoes,
      },
    })

    await registrarExecucao(pedidoId, 'processar-aprovacao', 'concluido', {
      novoStatus: 'EM_REVISAO',
      rodadasRevisao: pedido.rodadasRevisao + 1,
    })
  }
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
