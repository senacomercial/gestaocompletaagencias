import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { processarAprovacao } from '@/lib/fotoia/agents/entregador'
import jwt from 'jsonwebtoken'

// POST /api/foto-ia/aprovar/[pedidoId]?token=X — aprovação/rejeição pelo cliente (sem auth)
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ pedidoId: string }> },
) {
  const { pedidoId } = await params
  const token = req.nextUrl.searchParams.get('token')

  if (!token) return NextResponse.json({ error: 'Token obrigatório' }, { status: 401 })

  // Verificar token JWT
  const secret = process.env.NEXTAUTH_SECRET ?? 'fotoia-secret'
  let decoded: { pedidoId: string }
  try {
    decoded = jwt.verify(token, secret) as { pedidoId: string }
  } catch {
    return NextResponse.json({ error: 'Token inválido ou expirado' }, { status: 401 })
  }

  if (decoded.pedidoId !== pedidoId) {
    return NextResponse.json({ error: 'Token não corresponde ao pedido' }, { status: 403 })
  }

  const pedido = await prisma.pedidoFotoIA.findUnique({
    where: { id: pedidoId, tokenGaleria: token },
  })
  if (!pedido) return NextResponse.json({ error: 'Pedido não encontrado' }, { status: 404 })

  const { aprovado, observacoes } = await req.json()

  try {
    await processarAprovacao(pedidoId, Boolean(aprovado), observacoes)
    return NextResponse.json({ ok: true, aprovado })
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}
