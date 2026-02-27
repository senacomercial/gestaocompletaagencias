import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import jwt from 'jsonwebtoken'

// GET /api/foto-ia/galeria/[token] — dados públicos da galeria pelo token JWT
export async function GET(
  _req: NextRequest,
  { params }: { params: { token: string } },
) {
  const { token } = params
  const secret = process.env.NEXTAUTH_SECRET ?? 'fotoia-secret'

  let decoded: { pedidoId: string }
  try {
    decoded = jwt.verify(token, secret) as { pedidoId: string }
  } catch {
    return NextResponse.json({ error: 'Token inválido ou expirado' }, { status: 401 })
  }

  const pedido = await prisma.pedidoFotoIA.findFirst({
    where: { id: decoded.pedidoId, tokenGaleria: token },
    select: {
      id: true,
      status: true,
      tipoFoto: true,
      tokenGaleria: true,
      lead: { select: { nome: true, empresa: true } },
      imagens: {
        select: { id: true, url: true, urlPublica: true, tipo: true, rodada: true, aprovada: true },
        orderBy: [{ rodada: 'asc' }, { criadoEm: 'asc' }],
      },
    },
  })

  if (!pedido) {
    return NextResponse.json({ error: 'Galeria não encontrada' }, { status: 404 })
  }

  return NextResponse.json({
    pedidoId: pedido.id,
    status: pedido.status,
    tipoFoto: pedido.tipoFoto,
    tokenGaleria: pedido.tokenGaleria,
    lead: pedido.lead,
    imagens: pedido.imagens,
  })
}
