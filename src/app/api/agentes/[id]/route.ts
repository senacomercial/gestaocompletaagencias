import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/auth'
import { Prisma } from '@prisma/client'
import { z } from 'zod'

const updateAgenteSchema = z.object({
  nome: z.string().optional(),
  status: z.enum(['DISPONIVEL', 'EM_EXECUCAO', 'INATIVO', 'ERRO']).optional(),
  configuracao: z.record(z.unknown()).optional(),
  descricao: z.string().optional(),
})

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const session = await requireAuth()
  const organizacaoId = session.user.organizacaoId

  const agente = await prisma.agente.findFirst({
    where: { id, organizacaoId },
    include: {
      squad: { select: { id: true, nome: true } },
      execucoes: {
        include: { logs: { orderBy: { timestamp: 'asc' } } },
        orderBy: { iniciadoEm: 'desc' },
        take: 20,
      },
    },
  })
  if (!agente) return NextResponse.json({ error: 'Agente não encontrado' }, { status: 404 })
  return NextResponse.json(agente)
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const session = await requireAuth()
  const organizacaoId = session.user.organizacaoId

  let body: unknown
  try { body = await req.json() } catch { return NextResponse.json({ error: 'Body inválido' }, { status: 400 }) }

  const parsed = updateAgenteSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 })

  const { configuracao, ...rest } = parsed.data
  const updated = await prisma.agente.updateMany({
    where: { id, organizacaoId },
    data: {
      ...rest,
      ...(configuracao !== undefined ? { configuracao: configuracao as Prisma.InputJsonObject } : {}),
    },
  })
  if (updated.count === 0) return NextResponse.json({ error: 'Agente não encontrado' }, { status: 404 })
  return NextResponse.json({ success: true })
}
