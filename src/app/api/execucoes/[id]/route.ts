import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/auth'

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const session = await requireAuth()
  const organizacaoId = session.user.organizacaoId

  const exec = await prisma.execucao.findFirst({
    where: { id, organizacaoId, status: { in: ['PENDENTE', 'EM_ANDAMENTO'] } },
  })
  if (!exec) return NextResponse.json({ error: 'Execução não encontrada ou não pode ser cancelada' }, { status: 404 })

  await prisma.$transaction([
    prisma.execucao.update({ where: { id }, data: { status: 'FALHA', concluidoEm: new Date() } }),
    prisma.agente.update({ where: { id: exec.agenteId }, data: { status: 'DISPONIVEL' } }),
  ])

  return NextResponse.json({ success: true })
}
