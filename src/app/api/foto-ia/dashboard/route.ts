import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const orgId = session.user.organizacaoId

  const now = new Date()
  const inicioMes = new Date(now.getFullYear(), now.getMonth(), 1)

  const ATIVOS = ['NOVO_LEAD','EM_QUALIFICACAO','PROPOSTA_ENVIADA','FOLLOWUP_1','FOLLOWUP_2',
    'AGUARDANDO_PAGAMENTO','PAGAMENTO_CONFIRMADO','COLETANDO_REQUISITOS','EM_PRODUCAO','AGUARDANDO_APROVACAO','EM_REVISAO']

  const [
    totalLeads,
    emProducao,
    aguardandoAprovacao,
    entreguesResult,
    totalResult,
    taxaResult,
    tempoResult,
    aprovacao1aResult,
    pedidosRecentes,
    porDia,
  ] = await Promise.all([
    // Leads ativos no pipeline
    prisma.pedidoFotoIA.count({ where: { organizacaoId: orgId, status: { in: ATIVOS as never[] } } }),

    // Em produção agora
    prisma.pedidoFotoIA.count({ where: { organizacaoId: orgId, status: 'EM_PRODUCAO' } }),

    // Aguardando aprovação
    prisma.pedidoFotoIA.count({ where: { organizacaoId: orgId, status: 'AGUARDANDO_APROVACAO' } }),

    // Entregues este mês + receita
    prisma.pedidoFotoIA.findMany({
      where: { organizacaoId: orgId, status: 'ENTREGUE', entregueEm: { gte: inicioMes } },
      select: { valorCobrado: true, criadoEm: true, entregueEm: true, rodadasRevisao: true },
    }),

    // Total de pedidos (para taxa de conversão)
    prisma.pedidoFotoIA.count({ where: { organizacaoId: orgId } }),

    // Pedidos com pagamento confirmado (para taxa)
    prisma.pedidoFotoIA.count({
      where: {
        organizacaoId: orgId,
        status: { in: ['PAGAMENTO_CONFIRMADO','COLETANDO_REQUISITOS','EM_PRODUCAO','AGUARDANDO_APROVACAO','EM_REVISAO','ENTREGUE'] as never[] },
      },
    }),

    // Tempo médio entrega
    prisma.pedidoFotoIA.findMany({
      where: { organizacaoId: orgId, status: 'ENTREGUE', entregueEm: { not: null } },
      select: { criadoEm: true, entregueEm: true },
      take: 50,
    }),

    // Taxa de aprovação 1ª rodada
    prisma.pedidoFotoIA.count({
      where: { organizacaoId: orgId, status: 'ENTREGUE', rodadasRevisao: 0 },
    }),

    // Pedidos recentes
    prisma.pedidoFotoIA.findMany({
      where: { organizacaoId: orgId },
      orderBy: { criadoEm: 'desc' },
      take: 8,
      include: { lead: { select: { nome: true, empresa: true } } },
      select: {
        id: true, status: true, tipoFoto: true, valorCobrado: true, criadoEm: true,
        lead: { select: { nome: true, empresa: true } },
      },
    }),

    // Pedidos por dia (últimos 7 dias)
    prisma.$queryRaw`
      SELECT DATE("criadoEm")::text as dia, COUNT(*)::int as total
      FROM "PedidoFotoIA"
      WHERE "organizacaoId" = ${orgId}
        AND "criadoEm" >= NOW() - INTERVAL '7 days'
      GROUP BY DATE("criadoEm")
      ORDER BY dia ASC
    ` as Promise<Array<{ dia: string; total: number }>>,
  ])

  const entreguesMes = entreguesResult.length
  const receitaMes = entreguesResult.reduce((acc, p) => acc + Number(p.valorCobrado ?? 0), 0)
  const taxaConversao = totalResult > 0 ? Math.round((taxaResult / totalResult) * 100) : 0

  const tempoMedioMs = tempoResult.length > 0
    ? tempoResult.reduce((acc, p) => {
        if (!p.entregueEm) return acc
        return acc + (p.entregueEm.getTime() - p.criadoEm.getTime())
      }, 0) / tempoResult.length
    : 0
  const tempoMedioHoras = Math.round(tempoMedioMs / (1000 * 60 * 60))

  const totalEntregues = await prisma.pedidoFotoIA.count({ where: { organizacaoId: orgId, status: 'ENTREGUE' } })
  const taxaAprovacao1aRodada = totalEntregues > 0
    ? Math.round((aprovacao1aResult / totalEntregues) * 100)
    : 0

  return NextResponse.json({
    totalLeads,
    emProducao,
    aguardandoAprovacao,
    entreguesMes,
    receitaMes,
    taxaConversao,
    tempoMedioHoras,
    taxaAprovacao1aRodada,
    pedidosRecentes,
    porDia,
  })
}
