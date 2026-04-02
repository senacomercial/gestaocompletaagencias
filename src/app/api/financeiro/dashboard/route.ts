import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/auth'
import { startOfMonth, endOfMonth, subMonths } from 'date-fns'

export async function GET() {
  const session = await requireAuth()
  const organizacaoId = session.user.organizacaoId
  const agora = new Date()

  // Atualizar lançamentos atrasados
  await prisma.lancamento.updateMany({
    where: { organizacaoId, status: 'PENDENTE', dataVencimento: { lt: agora } },
    data: { status: 'ATRASADO' },
  })

  const [vgvTotal, mrr, recebidoMes, emAberto, atrasados, statusDist] = await Promise.all([
    prisma.lead.aggregate({ where: { organizacaoId, status: 'VENDA_REALIZADA' }, _sum: { vgvTotal: true } }),
    prisma.contratoFinanceiro.aggregate({ where: { organizacaoId, ativo: true, tipoPagamento: 'RECORRENTE' }, _sum: { recorrenciaMensal: true } }),
    prisma.lancamento.aggregate({
      where: { organizacaoId, status: 'PAGO', dataPagamento: { gte: startOfMonth(agora), lte: endOfMonth(agora) } },
      _sum: { valorPago: true },
    }),
    prisma.lancamento.aggregate({ where: { organizacaoId, status: 'PENDENTE' }, _sum: { valor: true } }),
    prisma.lancamento.aggregate({ where: { organizacaoId, status: 'ATRASADO' }, _sum: { valor: true } }),
    prisma.lancamento.groupBy({ by: ['status'], where: { organizacaoId }, _count: { id: true } }),
  ])

  // Recebimentos por mês (12 meses)
  const recebPorMes = await Promise.all(
    Array.from({ length: 12 }, (_, i) => {
      const mes = subMonths(agora, 11 - i)
      return prisma.lancamento.aggregate({
        where: { organizacaoId, status: 'PAGO', dataPagamento: { gte: startOfMonth(mes), lte: endOfMonth(mes) } },
        _sum: { valorPago: true },
      }).then((r) => ({ mes: mes.toISOString().slice(0, 7), valor: r._sum.valorPago?.toString() ?? '0' }))
    })
  )

  const [proximosVencimentos, inadimplentes, topClientes] = await Promise.all([
    prisma.lancamento.findMany({
      where: { organizacaoId, status: 'PENDENTE', dataVencimento: { gte: agora, lte: new Date(agora.getTime() + 15 * 86400000) } },
      include: { contrato: { include: { lead: { select: { nome: true, empresa: true } } } } },
      orderBy: { dataVencimento: 'asc' },
      take: 10,
    }),
    prisma.lancamento.findMany({
      where: { organizacaoId, status: 'ATRASADO' },
      include: { contrato: { include: { lead: { select: { nome: true, empresa: true } } } } },
      orderBy: { dataVencimento: 'asc' },
      take: 10,
    }),
    prisma.lead.findMany({
      where: { organizacaoId, status: 'VENDA_REALIZADA' },
      orderBy: { vgvTotal: 'desc' },
      take: 5,
      select: { id: true, nome: true, empresa: true, vgvTotal: true },
    }),
  ])

  const totalLanc = statusDist.reduce((a, b) => a + b._count.id, 0)

  return NextResponse.json({
    vgvTotal: vgvTotal._sum.vgvTotal?.toString() ?? '0',
    mrr: mrr._sum.recorrenciaMensal?.toString() ?? '0',
    recebidoMes: recebidoMes._sum.valorPago?.toString() ?? '0',
    emAberto: emAberto._sum.valor?.toString() ?? '0',
    totalAtrasado: atrasados._sum.valor?.toString() ?? '0',
    taxaInadimplencia: totalLanc > 0
      ? Math.round(((statusDist.find((s) => s.status === 'ATRASADO')?._count.id ?? 0) / totalLanc) * 100)
      : 0,
    recebPorMes,
    statusDistribuicao: statusDist,
    proximosVencimentos: proximosVencimentos.map((l) => ({
      id: l.id,
      descricao: l.descricao,
      valor: l.valor.toString(),
      dataVencimento: l.dataVencimento,
      cliente: l.contrato.lead.empresa ?? l.contrato.lead.nome,
    })),
    inadimplentes: inadimplentes.map((l) => ({
      id: l.id,
      descricao: l.descricao,
      valor: l.valor.toString(),
      dataVencimento: l.dataVencimento,
      cliente: l.contrato.lead.empresa ?? l.contrato.lead.nome,
      diasAtraso: Math.floor((agora.getTime() - l.dataVencimento.getTime()) / 86400000),
    })),
    topClientes: topClientes.map((c) => ({ ...c, vgvTotal: c.vgvTotal?.toString() ?? '0' })),
  })
}
