import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { StatusPedidoFoto } from '@prisma/client'
import { saveImageFromUrl } from '@/lib/fotoia/storage/storage-service'
import { onStatusChange } from '@/lib/fotoia/pipeline-orchestrator'

// POST /api/foto-ia/webhook/replicate — recebe resultado das gerações de imagem
export async function POST(req: NextRequest) {
  // Replicate envia o webhook sem assinatura por padrão em alguns planos
  // Verificar pelo header Authorization se configurado
  const authHeader = req.headers.get('authorization')
  const webhookSecret = process.env.REPLICATE_WEBHOOK_SECRET
  if (webhookSecret && authHeader !== `Bearer ${webhookSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let payload: {
    id: string
    status: 'starting' | 'processing' | 'succeeded' | 'failed' | 'canceled'
    output?: string[]
    error?: string
  }
  try {
    payload = await req.json()
  } catch {
    return NextResponse.json({ error: 'Payload inválido' }, { status: 400 })
  }

  const { id: predictionId, status, output, error } = payload

  const pedido = await prisma.pedidoFotoIA.findFirst({
    where: { predictionId },
  })

  if (!pedido) {
    console.warn(`[WebhookReplicate] Prediction ${predictionId} não encontrada em nenhum pedido`)
    return NextResponse.json({ ok: true })
  }

  if (status === 'succeeded' && output && output.length > 0) {
    // Salvar imagens no storage
    const imagensParaCriar = []
    for (let i = 0; i < output.length; i++) {
      try {
        const filename = `gerada-${i + 1}-${Date.now()}.png`
        const { url } = await saveImageFromUrl(output[i], pedido.organizacaoId, pedido.id, filename)
        imagensParaCriar.push({
          pedidoId: pedido.id,
          url,
          urlPublica: output[i],
          tipo: 'gerada',
          rodada: pedido.rodadasRevisao + 1,
          aprovada: false,
        })
      } catch (saveErr) {
        console.error(`[WebhookReplicate] Erro ao salvar imagem ${i}:`, saveErr)
      }
    }

    await prisma.$transaction([
      prisma.imagemFotoIA.createMany({ data: imagensParaCriar }),
      prisma.execucaoFotoIA.create({
        data: {
          pedidoId: pedido.id,
          etapa: 'webhook-replicate',
          status: 'concluido',
          saida: { predictionId, qtdImagens: imagensParaCriar.length },
        },
      }),
    ])

    // Avançar para AGUARDANDO_APROVACAO
    await prisma.pedidoFotoIA.update({
      where: { id: pedido.id },
      data: { status: StatusPedidoFoto.AGUARDANDO_APROVACAO },
    })
    await onStatusChange(pedido.id, StatusPedidoFoto.AGUARDANDO_APROVACAO)

  } else if (status === 'failed') {
    const config = await prisma.fotoIAConfig.findUnique({
      where: { organizacaoId: pedido.organizacaoId },
    })
    const maxTentativas = config?.maxTentativas ?? 3

    await prisma.execucaoFotoIA.create({
      data: {
        pedidoId: pedido.id,
        etapa: 'webhook-replicate',
        status: 'erro',
        erro: error ?? 'Prediction failed',
      },
    })

    if (pedido.tentativasGeracao < maxTentativas) {
      // Retry: recolocar na queue após 5 minutos
      await prisma.geracaoQueue.upsert({
        where: { pedidoId: pedido.id },
        create: { pedidoId: pedido.id, tentativas: pedido.tentativasGeracao },
        update: { processado: false, tentativas: pedido.tentativasGeracao },
      })

      await prisma.pedidoFotoIA.update({
        where: { id: pedido.id },
        data: { status: StatusPedidoFoto.PAGAMENTO_CONFIRMADO, predictionId: null },
      })
    } else {
      // Max tentativas atingido
      await prisma.pedidoFotoIA.update({
        where: { id: pedido.id },
        data: { status: StatusPedidoFoto.CANCELADO },
      })
    }
  }

  return NextResponse.json({ ok: true })
}
