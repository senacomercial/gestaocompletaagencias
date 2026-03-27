import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/auth'
import { z } from 'zod'

const encerrarSchema = z.object({ motivoEncerramento: z.string().min(1) })

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const session = await requireAuth()
  const organizacaoId = session.user.organizacaoId

  let body: unknown
  try { body = await req.json() } catch { return NextResponse.json({ error: 'Body inválido' }, { status: 400 }) }

  const parsed = encerrarSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 })

  const contrato = await prisma.contratoFinanceiro.findFirst({ where: { id, organizacaoId } })
  if (!contrato) return NextResponse.json({ error: 'Contrato não encontrado' }, { status: 404 })

  await prisma.$transaction([
    prisma.contratoFinanceiro.update({
      where: { id },
      data: { ativo: false, motivoEncerramento: parsed.data.motivoEncerramento },
    }),
    prisma.lancamento.updateMany({
      where: { contratoId: id, status: 'PENDENTE' },
      data: { status: 'CANCELADO' },
    }),
  ])

  return NextResponse.json({ success: true })
}
