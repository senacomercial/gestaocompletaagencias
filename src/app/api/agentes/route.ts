import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/auth'
import { Prisma } from '@prisma/client'
import { z } from 'zod'

const createAgenteSchema = z.object({
  nome: z.string().min(1),
  role: z.string().min(1),
  icone: z.string().default('🤖'),
  descricao: z.string().optional(),
  squadId: z.string().cuid(),
  configuracao: z.record(z.unknown()).default({}),
})

export async function GET() {
  const session = await requireAuth()
  const organizacaoId = session.user.organizacaoId

  const agentes = await prisma.agente.findMany({
    where: { organizacaoId },
    include: {
      squad: { select: { id: true, nome: true } },
      execucoes: { orderBy: { iniciadoEm: 'desc' }, take: 1 },
    },
  })
  return NextResponse.json(agentes)
}

export async function POST(req: NextRequest) {
  const session = await requireAuth()
  const organizacaoId = session.user.organizacaoId

  let body: unknown
  try { body = await req.json() } catch { return NextResponse.json({ error: 'Body inválido' }, { status: 400 }) }

  const parsed = createAgenteSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 })

  const squad = await prisma.squad.findFirst({ where: { id: parsed.data.squadId, organizacaoId } })
  if (!squad) return NextResponse.json({ error: 'Squad não encontrado' }, { status: 404 })

  const agente = await prisma.agente.create({
    data: {
      nome: parsed.data.nome,
      role: parsed.data.role,
      icone: parsed.data.icone,
      descricao: parsed.data.descricao,
      squadId: parsed.data.squadId,
      organizacaoId,
      configuracao: parsed.data.configuracao as Prisma.InputJsonObject,
    },
  })
  return NextResponse.json(agente, { status: 201 })
}
