import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/auth'
import { createDetalhamentoSchema } from '@/lib/validators/projeto'

export async function POST(req: NextRequest, { params }: { params: Promise<{id: string}> }) {
  const session = await requireAuth()
  const organizacaoId = session.user.organizacaoId

  const tarefa = await prisma.tarefa.findFirst({
    where: { id: (await params).id, projeto: { organizacaoId } },
    select: { id: true },
  })
  if (!tarefa) return NextResponse.json({ error: 'Tarefa não encontrada' }, { status: 404 })

  let body: unknown
  try { body = await req.json() } catch { return NextResponse.json({ error: 'Body inválido' }, { status: 400 }) }

  const parsed = createDetalhamentoSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 })

  const detalhamento = await prisma.detalhamento.create({
    data: {
      conteudo: parsed.data.conteudo,
      tarefaId: (await params).id,
      autorId: session.user.id,
    },
    include: { autor: { select: { id: true, nome: true } } },
  })
  return NextResponse.json(detalhamento, { status: 201 })
}
