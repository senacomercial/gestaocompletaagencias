import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/auth'

export async function GET(_req: NextRequest, { params }: { params: Promise<{id: string}> }) {
  const session = await requireAuth()
  const organizacaoId = session.user.organizacaoId

  const preset = await prisma.presetServico.findFirst({
    where: { id: (await params).id, organizacaoId },
    include: { tarefas: { orderBy: { ordemPadrao: 'asc' } } },
  })
  if (!preset) return NextResponse.json({ error: 'Preset não encontrado' }, { status: 404 })
  return NextResponse.json(preset)
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{id: string}> }) {
  const session = await requireAuth()
  const organizacaoId = session.user.organizacaoId

  const preset = await prisma.presetServico.findFirst({ where: { id: (await params).id, organizacaoId } })
  if (!preset) return NextResponse.json({ error: 'Preset não encontrado' }, { status: 404 })
  await prisma.presetServico.delete({ where: { id: (await params).id } })
  return NextResponse.json({ success: true })
}
