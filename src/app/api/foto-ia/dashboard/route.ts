import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { startOfMonth, endOfMonth } from 'date-fns'

// GET /api/foto-ia/dashboard — métricas do dashboard FotoIA
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const orgId = session.user.organizacaoId
  const hoje = new Date()
  const inicioMes = startOfMonth(hoje)
  const fimMes = endOfMonth(hoje)

  const [
    totalLeads,
    emProducao,
    entreguesMes,
    receitaMes,
    aguardandoAprovacao,
    totalPedidos,
    pedidosRecentes,
  ] = await Promise.all([
    // Total de leads no pipeline (excl. Entregue/Cancelado/Perdido)
    prisma.pedidoFotoIA.count({
      where: {
        organizacaoId: orgId,
        status: { notIn: ['ENTREGUE', 'CANCELADO', 'PERDIDO'] },
      },
    }),
    // Em produção agora
    prisma.pedidoFotoIA.count({
      where: { organizacaoId: orgId, status: 'EM_PRODUCAO' },
    }),
    // Entregues este mês
    prisma.pedidoFotoIA.count({
      where: {
        organizacaoId: orgId,
        status: 'ENTREGUE',
        entregueEm: { gte: inicioMes, lte: fimMes },
      },
    }),
    // Receita do mês (pedidos com pagamento confirmado neste mês)
    prisma.pedidoFotoIA.aggregate({
      where: {
        organizacaoId: orgId,
        status: { in: ['PAGAMENTO_CONFIRMADO', 'EM_PRODUCAO', 'AGUARDANDO_APROVACAO', 'EM_REVISAO', 'ENTREGUE'] },
        atualizadoEm: { gte: inicioMes, lte: fimMes },
      },
      _sum: { valorCobrado: true },
    }),
    // Aguardando aprovação do cliente
    prisma.pedidoFotoIA.count({
      where: { organizacaoId: orgId, status: 'AGUARDANDO_APROVACAO' },
    }),
    // Total de pedidos já criados
    prisma.pedidoFotoIA.count({ where: { organizacaoId: orgId } }),
    // Pedidos recentes (últimos 5)
    prisma.pedidoFotoIA.findMany({
      where: { organizacaoId: orgId },
      orderBy: { criadoEm: 'desc' },
      take: 5,
      include: {
        lead: { select: { nome: true, empresa: true } },
      },
    }),
  ])

  // Taxa de conversão (lead → pagamento confirmado)
  const totalConversoes = await prisma.pedidoFotoIA.count({
    where: {
      organizacaoId: orgId,
      status: { in: ['PAGAMENTO_CONFIRMADO', 'EM_PRODUCAO', 'AGUARDANDO_APROVACAO', 'EM_REVISAO', 'ENTREGUE'] },
    },
  })
  const taxaConversao = totalPedidos > 0
    ? Math.round((totalConversoes / totalPedidos) * 100)
    : 0

  return NextResponse.json({
    totalLeads,
    emProducao,
    entreguesMes,
    receitaMes: Number(receitaMes._sum.valorCobrado ?? 0),
    aguardandoAprovacao,
    taxaConversao,
    pedidosRecentes,
  })
}
