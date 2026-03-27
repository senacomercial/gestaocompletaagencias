import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/auth'
import { z } from 'zod'

const pagarSchema = z.object({
  dataPagamento: z.string().datetime(),
  valorPago: z.number().positive(),
})

export async function PATCH(req: NextRequest, { params }: { params: Promise<{id: string}> }) {
  const session = await requireAuth()
  const organizacaoId = session.user.organizacaoId

  let body: unknown
  try { body = await req.json() } catch { return NextResponse.json({ error: 'Body inválido' }, { status: 400 }) }

  const parsed = pagarSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 })

  const lancamento = await prisma.lancamento.findFirst({ where: { id: (await params).id, organizacaoId } })
  if (!lancamento) return NextResponse.json({ error: 'Lançamento não encontrado' }, { status: 404 })

  const updated = await prisma.lancamento.update({
    where: { id: (await params).id },
    data: { status: 'PAGO', dataPagamento: new Date(parsed.data.dataPagamento), valorPago: parsed.data.valorPago },
  })
  return NextResponse.json({ ...updated, valor: updated.valor.toString(), valorPago: updated.valorPago?.toString() ?? null })
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{id: string}> }) {
  const session = await requireAuth()
  const organizacaoId = session.user.organizacaoId

  const lancamento = await prisma.lancamento.findFirst({ where: { id: (await params).id, organizacaoId, status: { in: ['PENDENTE', 'ATRASADO'] } } })
  if (!lancamento) return NextResponse.json({ error: 'Lançamento não pode ser excluído' }, { status: 404 })

  await prisma.lancamento.delete({ where: { id: (await params).id } })
  return NextResponse.json({ success: true })
}
