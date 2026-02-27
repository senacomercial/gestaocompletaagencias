import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/auth'
import { updateProjetoSchema } from '@/lib/validators/projeto'

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await requireAuth()
  const organizacaoId = session.user.organizacaoId

  const projeto = await prisma.projeto.findFirst({
    where: { id: params.id, organizacaoId },
    include: {
      lead: { select: { id: true, nome: true, empresa: true, telefone: true } },
      contrato: {
        include: { lancamentos: { orderBy: { dataVencimento: 'asc' } } },
      },
      sprints: { orderBy: { dataInicio: 'asc' } },
      tarefas: {
        include: {
          responsavel: { select: { id: true, nome: true } },
          sprint: { select: { id: true, nome: true } },
          _count: { select: { detalhamentos: true } },
        },
        orderBy: [{ ordem: 'asc' }],
      },
    },
  })

  if (!projeto) return NextResponse.json({ error: 'Projeto não encontrado' }, { status: 404 })

  return NextResponse.json({
    ...projeto,
    contrato: projeto.contrato
      ? {
          ...projeto.contrato,
          valorTotal: projeto.contrato.valorTotal.toString(),
          recorrenciaMensal: projeto.contrato.recorrenciaMensal?.toString() ?? null,
          lancamentos: projeto.contrato.lancamentos.map((l) => ({
            ...l,
            valor: l.valor.toString(),
            valorPago: l.valorPago?.toString() ?? null,
          })),
        }
      : null,
  })
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await requireAuth()
  const organizacaoId = session.user.organizacaoId

  let body: unknown
  try { body = await req.json() } catch { return NextResponse.json({ error: 'Body inválido' }, { status: 400 }) }

  const parsed = updateProjetoSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 })

  const updated = await prisma.projeto.updateMany({ where: { id: params.id, organizacaoId }, data: parsed.data })
  if (updated.count === 0) return NextResponse.json({ error: 'Projeto não encontrado' }, { status: 404 })
  return NextResponse.json({ success: true })
}
