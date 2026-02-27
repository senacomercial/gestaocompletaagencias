import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/auth'

export async function GET() {
  const session = await requireAuth()
  const organizacaoId = session.user.organizacaoId

  const contratos = await prisma.contratoFinanceiro.findMany({
    where: { organizacaoId },
    include: {
      lead: { select: { id: true, nome: true, empresa: true } },
      projeto: { select: { id: true, nome: true, tipoServico: true } },
      lancamentos: { orderBy: { dataVencimento: 'asc' } },
    },
    orderBy: { createdAt: 'desc' },
  })

  return NextResponse.json(
    contratos.map((c) => ({
      ...c,
      valorTotal: c.valorTotal.toString(),
      recorrenciaMensal: c.recorrenciaMensal?.toString() ?? null,
      lancamentos: c.lancamentos.map((l) => ({
        ...l,
        valor: l.valor.toString(),
        valorPago: l.valorPago?.toString() ?? null,
      })),
    }))
  )
}
