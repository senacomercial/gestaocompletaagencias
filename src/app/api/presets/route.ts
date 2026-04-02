import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/auth'
import { createPresetSchema } from '@/lib/validators/projeto'

export async function GET() {
  const session = await requireAuth()
  const organizacaoId = session.user.organizacaoId

  const presets = await prisma.presetServico.findMany({
    where: { organizacaoId },
    include: { tarefas: { orderBy: { ordemPadrao: 'asc' } } },
    orderBy: { createdAt: 'asc' },
  })
  return NextResponse.json(presets)
}

export async function POST(req: NextRequest) {
  const session = await requireAuth()
  const organizacaoId = session.user.organizacaoId

  let body: unknown
  try { body = await req.json() } catch { return NextResponse.json({ error: 'Body inválido' }, { status: 400 }) }

  const parsed = createPresetSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 })

  const preset = await prisma.presetServico.create({
    data: {
      nome: parsed.data.nome,
      organizacaoId,
      tarefas: {
        create: parsed.data.tarefas.map((t, i) => ({
          titulo: t.titulo,
          descricao: t.descricao ?? null,
          ordemPadrao: t.ordemPadrao || i,
        })),
      },
    },
    include: { tarefas: { orderBy: { ordemPadrao: 'asc' } } },
  })
  return NextResponse.json(preset, { status: 201 })
}
