import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/auth'
import { Prisma } from '@prisma/client'
import { z } from 'zod'

const createExecucaoSchema = z.object({
  agenteId: z.string().cuid(),
  comando: z.string().min(1),
  input: z.record(z.unknown()).optional(),
})

export async function GET(req: NextRequest) {
  const session = await requireAuth()
  const organizacaoId = session.user.organizacaoId
  const { searchParams } = new URL(req.url)
  const agenteId = searchParams.get('agenteId')

  const execucoes = await prisma.execucao.findMany({
    where: { organizacaoId, ...(agenteId ? { agenteId } : {}) },
    include: {
      agente: { select: { id: true, nome: true, icone: true } },
      usuario: { select: { id: true, nome: true } },
    },
    orderBy: { iniciadoEm: 'desc' },
    take: 50,
  })
  return NextResponse.json(execucoes)
}

export async function POST(req: NextRequest) {
  const session = await requireAuth()
  const organizacaoId = session.user.organizacaoId

  let body: unknown
  try { body = await req.json() } catch { return NextResponse.json({ error: 'Body inválido' }, { status: 400 }) }

  const parsed = createExecucaoSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 })

  const agente = await prisma.agente.findFirst({
    where: { id: parsed.data.agenteId, organizacaoId, status: 'DISPONIVEL' },
  })
  if (!agente) return NextResponse.json({ error: 'Agente não disponível' }, { status: 400 })

  const execucao = await prisma.$transaction(async (tx) => {
    await tx.agente.update({ where: { id: agente.id }, data: { status: 'EM_EXECUCAO' } })
    return tx.execucao.create({
      data: {
        agenteId: agente.id,
        usuarioId: session.user.id,
        organizacaoId,
        comando: parsed.data.comando,
        input: (parsed.data.input ?? {}) as Prisma.InputJsonObject,
        status: 'PENDENTE',
      },
    })
  })

  return NextResponse.json(execucao, { status: 201 })
}
