import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/auth'

export async function GET(req: NextRequest) {
  const session = await requireAuth()
  const organizacaoId = session.user.organizacaoId
  const { searchParams } = new URL(req.url)
  const status = searchParams.get('status')
  const mes = searchParams.get('mes') // YYYY-MM

  // Atualizar atrasados
  await prisma.lancamento.updateMany({
    where: { organizacaoId, status: 'PENDENTE', dataVencimento: { lt: new Date() } },
    data: { status: 'ATRASADO' },
  })

  const where: Record<string, unknown> = { organizacaoId }
  if (status) where.status = status
  if (mes) {
    const [ano, m] = mes.split('-').map(Number)
    where.dataVencimento = { gte: new Date(ano, m - 1, 1), lte: new Date(ano, m, 0) }
  }

  const lancamentos = await prisma.lancamento.findMany({
    where,
    include: { contrato: { lead: { select: { nome: true, empresa: true } } },
    orderBy: { dataVencimento: 'asc' },
    take: 200,
  })

  return NextResponse.json(
    lancamentos.map((l) => ({
      ...l,
      valor: l.valor.toString(),
      valorPago: l.valorPago?.toString() ?? null,
      cliente: l.contrato.lead.empresa ?? l.contrato.lead.nome,
    }))
  )
}
