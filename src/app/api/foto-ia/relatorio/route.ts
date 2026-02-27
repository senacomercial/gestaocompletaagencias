import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { startOfWeek, startOfMonth, subWeeks, subMonths } from 'date-fns'

// GET /api/foto-ia/relatorio?periodo=semana|mes
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const periodo = req.nextUrl.searchParams.get('periodo') ?? 'semana'
  const orgId = session.user.organizacaoId

  const now = new Date()
  const inicio = periodo === 'mes'
    ? startOfMonth(now)
    : startOfWeek(now, { weekStartsOn: 1 })
  const inicioAnterior = periodo === 'mes'
    ? startOfMonth(subMonths(now, 1))
    : startOfWeek(subWeeks(now, 1), { weekStartsOn: 1 })
  const fimAnterior = inicio

  const [
    pedidosPeriodo,
    pedidosAnterior,
    entreguesPeriodo,
    receitaPeriodo,
    tempoMedio,
  ] = await Promise.all([
    prisma.pedidoFotoIA.count({
      where: { organizacaoId: orgId, criadoEm: { gte: inicio } },
    }),
    prisma.pedidoFotoIA.count({
      where: { organizacaoId: orgId, criadoEm: { gte: inicioAnterior, lt: fimAnterior } },
    }),
    prisma.pedidoFotoIA.count({
      where: { organizacaoId: orgId, status: 'ENTREGUE', entregueEm: { gte: inicio } },
    }),
    prisma.pedidoFotoIA.aggregate({
      where: { organizacaoId: orgId, status: 'ENTREGUE', entregueEm: { gte: inicio } },
      _sum: { valorCobrado: true },
    }),
    prisma.pedidoFotoIA.findMany({
      where: { organizacaoId: orgId, status: 'ENTREGUE', criadoEm: { gte: inicio } },
      select: { criadoEm: true, entregueEm: true },
    }),
  ])

  const taxaConversao = pedidosPeriodo > 0
    ? Math.round((entreguesPeriodo / pedidosPeriodo) * 100)
    : 0

  const tempoMedioMs = tempoMedio.length > 0
    ? tempoMedio.reduce((acc, p) => {
        if (!p.entregueEm) return acc
        return acc + (p.entregueEm.getTime() - p.criadoEm.getTime())
      }, 0) / tempoMedio.length
    : 0

  const crescimento = pedidosAnterior > 0
    ? Math.round(((pedidosPeriodo - pedidosAnterior) / pedidosAnterior) * 100)
    : 0

  return NextResponse.json({
    periodo,
    pedidosCriados: pedidosPeriodo,
    pedidosConcluidos: entreguesPeriodo,
    receita: Number(receitaPeriodo._sum.valorCobrado ?? 0),
    taxaConversao,
    tempoMedioHoras: Math.round(tempoMedioMs / (1000 * 60 * 60)),
    crescimento,
  })
}
