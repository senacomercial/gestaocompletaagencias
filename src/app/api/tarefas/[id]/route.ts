import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/auth'
import { updateTarefaSchema } from '@/lib/validators/projeto'

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const session = await requireAuth()
  const organizacaoId = session.user.organizacaoId

  const tarefa = await prisma.tarefa.findFirst({
    where: { id, projeto: { organizacaoId } },
    include: {
      responsavel: { select: { id: true, nome: true } },
      sprint: { select: { id: true, nome: true, dataInicio: true, dataFim: true } },
      detalhamentos: {
        include: { autor: { select: { id: true, nome: true } } },
        orderBy: { createdAt: 'asc' },
      },
    },
  })

  if (!tarefa) return NextResponse.json({ error: 'Tarefa não encontrada' }, { status: 404 })
  return NextResponse.json(tarefa)
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const session = await requireAuth()
  const organizacaoId = session.user.organizacaoId

  let body: unknown
  try { body = await req.json() } catch { return NextResponse.json({ error: 'Body inválido' }, { status: 400 }) }

  const parsed = updateTarefaSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 })

  const tarefa = await prisma.tarefa.findFirst({
    where: { id, projeto: { organizacaoId } },
    select: { id: true },
  })
  if (!tarefa) return NextResponse.json({ error: 'Tarefa não encontrada' }, { status: 404 })

  const updated = await prisma.tarefa.update({
    where: { id },
    data: {
      ...parsed.data,
      prazo: parsed.data.prazo !== undefined
        ? (parsed.data.prazo ? new Date(parsed.data.prazo) : null)
        : undefined,
    },
    include: {
      responsavel: { select: { id: true, nome: true } },
      sprint: { select: { id: true, nome: true } },
    },
  })
  return NextResponse.json(updated)
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const session = await requireAuth()
  const organizacaoId = session.user.organizacaoId

  const tarefa = await prisma.tarefa.findFirst({
    where: { id, projeto: { organizacaoId } },
    select: { id: true },
  })
  if (!tarefa) return NextResponse.json({ error: 'Tarefa não encontrada' }, { status: 404 })
  await prisma.tarefa.delete({ where: { id } })
  return NextResponse.json({ success: true })
}
