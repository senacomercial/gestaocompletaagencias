import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/auth'
import { z } from 'zod'

const createSquadSchema = z.object({
  nome: z.string().min(1),
  descricao: z.string().optional(),
  avatar: z.string().default('🤖'),
  cor: z.string().default('#D4AF37'),
})

export async function GET() {
  const session = await requireAuth()
  const organizacaoId = session.user.organizacaoId

  const squads = await prisma.squad.findMany({
    where: { organizacaoId },
    include: {
      agentes: {
        include: {
          execucoes: { orderBy: { iniciadoEm: 'desc' }, take: 1, select: { id: true, status: true, iniciadoEm: true } },
        },
      },
      _count: { select: { agentes: true } },
    },
    orderBy: { createdAt: 'asc' },
  })
  return NextResponse.json(squads)
}

export async function POST(req: NextRequest) {
  const session = await requireAuth()
  const organizacaoId = session.user.organizacaoId

  let body: unknown
  try { body = await req.json() } catch { return NextResponse.json({ error: 'Body inválido' }, { status: 400 }) }

  const parsed = createSquadSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 })

  const squad = await prisma.squad.create({ data: { ...parsed.data, organizacaoId } })
  return NextResponse.json(squad, { status: 201 })
}
