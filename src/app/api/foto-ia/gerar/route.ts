import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { gerarImagens } from '@/lib/fotoia/agents/produtor'

// POST /api/foto-ia/gerar — dispara geração manual de imagens para um pedido
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { pedidoId } = await req.json()
  if (!pedidoId) return NextResponse.json({ error: 'pedidoId obrigatório' }, { status: 400 })

  const pedido = await prisma.pedidoFotoIA.findFirst({
    where: { id: pedidoId, organizacaoId: session.user.organizacaoId },
  })
  if (!pedido) return NextResponse.json({ error: 'Pedido não encontrado' }, { status: 404 })

  try {
    await gerarImagens(pedidoId)
    const updated = await prisma.pedidoFotoIA.findUnique({ where: { id: pedidoId } })
    return NextResponse.json({ ok: true, status: updated?.status, predictionId: updated?.predictionId })
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}
