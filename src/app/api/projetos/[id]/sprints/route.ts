import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/auth'
import { createSprintSchema } from '@/lib/validators/projeto'

export async function POST(req: NextRequest, { params }: { params: Promise<{id: string}> }) {
  const session = await requireAuth()
  const organizacaoId = session.user.organizacaoId

  const projeto = await prisma.projeto.findFirst({ where: { id: (await params).id, organizacaoId } })
  if (!projeto) return NextResponse.json({ error: 'Projeto não encontrado' }, { status: 404 })

  let body: unknown
  try { body = await req.json() } catch { return NextResponse.json({ error: 'Body inválido' }, { status: 400 }) }

  const parsed = createSprintSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 })

  const sprint = await prisma.sprint.create({
    data: {
      nome: parsed.data.nome,
      dataInicio: new Date(parsed.data.dataInicio),
      dataFim: new Date(parsed.data.dataFim),
      projetoId: (await params).id,
      organizacaoId,
    },
  })
  return NextResponse.json(sprint, { status: 201 })
}
