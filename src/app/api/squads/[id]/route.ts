import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/auth'
import { z } from 'zod'

const updateSquadSchema = z.object({
  nome: z.string().optional(),
  descricao: z.string().optional(),
  ativo: z.boolean().optional(),
})

export async function PUT(req: NextRequest, { params }: { params: Promise<{id: string}> }) {
  const session = await requireAuth()
  const organizacaoId = session.user.organizacaoId

  let body: unknown
  try { body = await req.json() } catch { return NextResponse.json({ error: 'Body inválido' }, { status: 400 }) }

  const parsed = updateSquadSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 })

  const updated = await prisma.squad.updateMany({ where: { id: (await params).id, organizacaoId }, data: parsed.data })
  if (updated.count === 0) return NextResponse.json({ error: 'Squad não encontrado' }, { status: 404 })
  return NextResponse.json({ success: true })
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{id: string}> }) {
  const session = await requireAuth()
  const organizacaoId = session.user.organizacaoId

  const squad = await prisma.squad.findFirst({ where: { id: (await params).id, organizacaoId } })
  if (!squad) return NextResponse.json({ error: 'Squad não encontrado' }, { status: 404 })
  await prisma.squad.delete({ where: { id: (await params).id } })
  return NextResponse.json({ success: true })
}
