import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// GET /api/foto-ia/pedidos/[id]
export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } },
) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const pedido = await prisma.pedidoFotoIA.findFirst({
    where: { id: params.id, organizacaoId: session.user.organizacaoId },
    include: {
      lead: { select: { id: true, nome: true, telefone: true, empresa: true, email: true } },
      imagens: { orderBy: [{ rodada: 'asc' }, { criadoEm: 'asc' }] },
      execucoes: { orderBy: { executadoEm: 'asc' } },
    },
  })

  if (!pedido) return NextResponse.json({ error: 'Pedido não encontrado' }, { status: 404 })
  return NextResponse.json(pedido)
}

// PATCH /api/foto-ia/pedidos/[id] — atualização manual de status
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { status, observacoes } = body

  const pedido = await prisma.pedidoFotoIA.findFirst({
    where: { id: params.id, organizacaoId: session.user.organizacaoId },
  })
  if (!pedido) return NextResponse.json({ error: 'Pedido não encontrado' }, { status: 404 })

  const updated = await prisma.pedidoFotoIA.update({
    where: { id: params.id },
    data: {
      ...(status && { status }),
      ...(observacoes !== undefined && { observacoes }),
    },
  })

  return NextResponse.json(updated)
}
