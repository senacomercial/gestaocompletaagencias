import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { StatusPedidoFoto } from '@prisma/client'
import { executarFollowUp } from '@/lib/fotoia/agents/vendedor'
import { gerarImagens } from '@/lib/fotoia/agents/produtor'
import { verificarPedidosTravados } from '@/lib/fotoia/alerts'
import { subHours } from 'date-fns'

// GET /api/cron/fotoia — executado a cada hora via Vercel Cron
// Autorização: CRON_SECRET header
export async function GET(req: NextRequest) {
  const cronSecret = process.env.CRON_SECRET
  if (cronSecret) {
    const authHeader = req.headers.get('authorization')
    if (authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
  }

  const agora = new Date()
  const resultados: Record<string, number> = {
    followup1: 0,
    followup2: 0,
    perdidos: 0,
    queueProcessados: 0,
    alertasGerados: 0,
    reenviosLink: 0,
  }

  // 1. Follow-up 1: PROPOSTA_ENVIADA há > 24h
  const config24h = await prisma.pedidoFotoIA.findMany({
    where: {
      status: StatusPedidoFoto.PROPOSTA_ENVIADA,
      criadoEm: { lt: subHours(agora, 24) },
    },
    select: { id: true },
  })
  for (const pedido of config24h) {
    try {
      await executarFollowUp(pedido.id, 1)
      resultados.followup1++
    } catch (e) {
      console.error(`[Cron] FollowUp1 error for ${pedido.id}:`, e)
    }
  }

  // 2. Follow-up 2: FOLLOWUP_1 há > 48h (total desde criação)
  const config48h = await prisma.pedidoFotoIA.findMany({
    where: {
      status: StatusPedidoFoto.FOLLOWUP_1,
      criadoEm: { lt: subHours(agora, 48) },
    },
    select: { id: true },
  })
  for (const pedido of config48h) {
    try {
      await executarFollowUp(pedido.id, 2)
      resultados.followup2++
    } catch (e) {
      console.error(`[Cron] FollowUp2 error for ${pedido.id}:`, e)
    }
  }

  // 3. Marcar PERDIDO: FOLLOWUP_2 ou AGUARDANDO_PAGAMENTO há > 72h
  const perdidosLead = await prisma.pedidoFotoIA.findMany({
    where: {
      status: { in: [StatusPedidoFoto.FOLLOWUP_2, StatusPedidoFoto.AGUARDANDO_PAGAMENTO] },
      criadoEm: { lt: subHours(agora, 72) },
    },
    select: { id: true },
  })
  if (perdidosLead.length > 0) {
    await prisma.pedidoFotoIA.updateMany({
      where: { id: { in: perdidosLead.map(p => p.id) } },
      data: { status: StatusPedidoFoto.PERDIDO },
    })
    resultados.perdidos = perdidosLead.length
  }

  // 4. Processar queue de geração pendente
  const queuePendente = await prisma.geracaoQueue.findMany({
    where: { processado: false },
    orderBy: [{ prioridade: 'desc' }],
    take: 5,
    include: { pedido: { select: { id: true, status: true, organizacaoId: true } } },
  })

  for (const item of queuePendente) {
    if (item.pedido.status !== StatusPedidoFoto.PAGAMENTO_CONFIRMADO) {
      await prisma.geracaoQueue.delete({ where: { id: item.id } })
      continue
    }
    try {
      await gerarImagens(item.pedidoId)
      await prisma.geracaoQueue.update({
        where: { id: item.id },
        data: { processado: true },
      })
      resultados.queueProcessados++
    } catch (e) {
      console.error(`[Cron] Queue error for ${item.pedidoId}:`, e)
      await prisma.geracaoQueue.update({
        where: { id: item.id },
        data: { tentativas: { increment: 1 } },
      })
    }
  }

  // 5. Verificar pedidos travados — AC:4 Story 8.7
  try {
    // Obter organizações com pedidos ativos
    const orgsAtivas = await prisma.pedidoFotoIA.findMany({
      where: {
        status: {
          notIn: [StatusPedidoFoto.ENTREGUE, StatusPedidoFoto.CANCELADO, StatusPedidoFoto.PERDIDO],
        },
      },
      select: { organizacaoId: true },
      distinct: ['organizacaoId'],
    })

    for (const { organizacaoId } of orgsAtivas) {
      const alertas = await verificarPedidosTravados(organizacaoId)

      // Persistir alertas como execuções de controle para acesso via painel
      for (const alerta of alertas) {
        await prisma.execucaoFotoIA.create({
          data: {
            pedidoId: alerta.pedidoId,
            etapa: `alerta:${alerta.tipo}`,
            status: 'erro',
            saida: {
              titulo: alerta.titulo,
              descricao: alerta.descricao,
              tipo: alerta.tipo,
              geradoEm: agora.toISOString(),
            },
          },
        })
        resultados.alertasGerados++
      }
    }
  } catch (e) {
    console.error('[Cron] Erro ao verificar pedidos travados:', e)
  }

  // 6. Timeout 48h: AGUARDANDO_PAGAMENTO sem reenvio → reenviar link (AC:5 Story 8.3)
  try {
    const pendentePagamento = await prisma.pedidoFotoIA.findMany({
      where: {
        status: StatusPedidoFoto.AGUARDANDO_PAGAMENTO,
        criadoEm: { lt: subHours(agora, 48) },
      },
      select: {
        id: true,
        organizacaoId: true,
        linkPagamento: true,
        valorCobrado: true,
        lead: { select: { nome: true, telefone: true } },
      },
    })

    for (const pedido of pendentePagamento) {
      // Evitar reenvio duplicado
      const jaReenviou = await prisma.execucaoFotoIA.findFirst({
        where: { pedidoId: pedido.id, etapa: 'reenvio-link-pagamento' },
      })
      if (jaReenviou) continue

      // Enviar lembrete via WhatsApp
      const socketUrl = process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:3001'
      const valor = pedido.valorCobrado ? Number(pedido.valorCobrado).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) : 'R$ --'
      const link = pedido.linkPagamento ?? ''
      const msg = `⏰ Lembrete: Seu pedido FotoIA está aguardando pagamento de ${valor}.\n\nEnvie o comprovante PIX para prosseguirmos.${link ? `\n\n🔗 Link: ${link}` : ''}`

      try {
        await fetch(`${socketUrl}/wa-send`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ organizacaoId: pedido.organizacaoId, telefone: pedido.lead.telefone, corpo: msg }),
        })

        await prisma.execucaoFotoIA.create({
          data: {
            pedidoId: pedido.id,
            etapa: 'reenvio-link-pagamento',
            status: 'ok',
            saida: { msg: 'Lembrete de pagamento reenviado via WhatsApp', geradoEm: agora.toISOString() },
          },
        })
        resultados.reenviosLink++
      } catch (e) {
        console.error(`[Cron] Erro reenvio link ${pedido.id}:`, e)
      }
    }
  } catch (e) {
    console.error('[Cron] Erro timeout 48h:', e)
  }

  return NextResponse.json({ ok: true, agora: agora.toISOString(), ...resultados })
}
