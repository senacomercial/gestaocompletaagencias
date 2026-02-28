import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const orgId = session.user.organizacaoId
  const { searchParams } = new URL(req.url)
  const periodo = searchParams.get('periodo') ?? 'semana'

  const agora = new Date()
  let desde: Date

  switch (periodo) {
    case 'mes':   desde = new Date(agora.getFullYear(), agora.getMonth(), 1);    break
    case 'semana': desde = new Date(agora.getTime() - 7 * 24 * 60 * 60 * 1000);  break
    case 'hoje':   desde = new Date(agora.getFullYear(), agora.getMonth(), agora.getDate()); break
    default:      desde = new Date(agora.getTime() - 7 * 24 * 60 * 60 * 1000)
  }

  const [criados, concluidos, receita, porStatus, tempos] = await Promise.all([
    prisma.pedidoFotoIA.count({ where: { organizacaoId: orgId, criadoEm: { gte: desde } } }),
    prisma.pedidoFotoIA.count({ where: { organizacaoId: orgId, status: 'ENTREGUE', entregueEm: { gte: desde } } }),
    prisma.pedidoFotoIA.aggregate({
      where: { organizacaoId: orgId, status: 'ENTREGUE', entregueEm: { gte: desde } },
      _sum: { valorCobrado: true },
    }),
    prisma.pedidoFotoIA.groupBy({
      by: ['status'],
      where: { organizacaoId: orgId, criadoEm: { gte: desde } },
      _count: true,
    }),
    prisma.pedidoFotoIA.findMany({
      where: { organizacaoId: orgId, status: 'ENTREGUE', entregueEm: { gte: desde }, criadoEm: { not: undefined } },
      select: { criadoEm: true, entregueEm: true, rodadasRevisao: true },
    }),
  ])

  const totalCriados = criados
  const totalConcluidos = concluidos
  const receitaTotal = Number(receita._sum.valorCobrado ?? 0)
  const taxaConversao = totalCriados > 0 ? Math.round((totalConcluidos / totalCriados) * 100) : 0

  const tempoMedio = tempos.length > 0
    ? Math.round(tempos.reduce((acc, p) => {
        if (!p.entregueEm) return acc
        return acc + (p.entregueEm.getTime() - p.criadoEm.getTime())
      }, 0) / tempos.length / (1000 * 60 * 60))
    : 0

  const semRevisao = tempos.filter(p => p.rodadasRevisao === 0).length
  const taxaAprovacao1aRodada = tempos.length > 0
    ? Math.round((semRevisao / tempos.length) * 100)
    : 0

  return NextResponse.json({
    periodo,
    desde: desde.toISOString(),
    pedidosCriados: totalCriados,
    pedidosConcluidos: totalConcluidos,
    receita: receitaTotal,
    taxaConversao,
    tempoMedioHoras: tempoMedio,
    taxaAprovacao1aRodada,
    porStatus: porStatus.map(s => ({ status: s.status, count: s._count })),
  })
}
