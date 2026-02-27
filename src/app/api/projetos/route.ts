import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/auth'
import { createProjetoSchema } from '@/lib/validators/projeto'

export async function GET() {
  const session = await requireAuth()
  const organizacaoId = session.user.organizacaoId

  const projetos = await prisma.projeto.findMany({
    where: { organizacaoId },
    include: {
      lead: { select: { nome: true, empresa: true } },
      contrato: { select: { valorTotal: true, recorrenciaMensal: true, tipoPagamento: true } },
      _count: { select: { tarefas: true } },
      tarefas: { where: { status: 'CONCLUIDA' }, select: { id: true } },
    },
    orderBy: { createdAt: 'desc' },
  })

  return NextResponse.json(
    projetos.map((p) => ({
      ...p,
      contrato: p.contrato
        ? {
            ...p.contrato,
            valorTotal: p.contrato.valorTotal.toString(),
            recorrenciaMensal: p.contrato.recorrenciaMensal?.toString() ?? null,
          }
        : null,
      totalTarefas: p._count.tarefas,
      tarefasConcluidas: p.tarefas.length,
    }))
  )
}

export async function POST(req: NextRequest) {
  const session = await requireAuth()
  const organizacaoId = session.user.organizacaoId

  let body: unknown
  try { body = await req.json() } catch { return NextResponse.json({ error: 'Body inválido' }, { status: 400 }) }

  const parsed = createProjetoSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 })

  const projeto = await prisma.projeto.create({ data: { ...parsed.data, organizacaoId } })
  return NextResponse.json(projeto, { status: 201 })
}
