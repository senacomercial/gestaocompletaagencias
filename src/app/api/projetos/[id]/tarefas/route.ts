import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/auth'
import { createTarefaSchema, aplicarPresetSchema } from '@/lib/validators/projeto'

export async function POST(req: NextRequest, { params }: { params: Promise<{id: string}> }) {
  const session = await requireAuth()
  const organizacaoId = session.user.organizacaoId
  const { id } = await params

  const projeto = await prisma.projeto.findFirst({ where: { id, organizacaoId } })
  if (!projeto) return NextResponse.json({ error: 'Projeto não encontrado' }, { status: 404 })

  let body: unknown
  try { body = await req.json() } catch { return NextResponse.json({ error: 'Body inválido' }, { status: 400 }) }

  // Verificar se é aplicação de preset
  const presetParsed = aplicarPresetSchema.safeParse(body)
  if (presetParsed.success) {
    const preset = await prisma.presetServico.findFirst({
      where: { id: presetParsed.data.presetId, organizacaoId },
      include: { tarefas: { orderBy: { ordemPadrao: 'asc' } } },
    })
    if (!preset) return NextResponse.json({ error: 'Preset não encontrado' }, { status: 404 })

    const tarefasFiltradas = presetParsed.data.tarefaIds
      ? preset.tarefas.filter((t) => presetParsed.data.tarefaIds!.includes(t.id))
      : preset.tarefas

    await prisma.tarefa.createMany({
      data: tarefasFiltradas.map((t, i) => ({
        titulo: t.titulo,
        descricao: t.descricao ?? null,
        ordem: t.ordemPadrao + i,
        projetoId: id,
        organizacaoId,
      })),
    })
    return NextResponse.json({ success: true, count: tarefasFiltradas.length })
  }

  const parsed = createTarefaSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 })

  const tarefa = await prisma.tarefa.create({
    data: {
      titulo: parsed.data.titulo,
      descricao: parsed.data.descricao ?? null,
      prazo: parsed.data.prazo ? new Date(parsed.data.prazo) : null,
      sprintId: parsed.data.sprintId ?? null,
      responsavelId: parsed.data.responsavelId ?? null,
      ordem: parsed.data.ordem,
      projetoId: id,
      organizacaoId,
    },
    include: { responsavel: { select: { id: true, nome: true } },
  })
  return NextResponse.json(tarefa, { status: 201 })
}
