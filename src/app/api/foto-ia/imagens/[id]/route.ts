import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { getImageBuffer } from '@/lib/fotoia/storage/storage-service'
import jwt from 'jsonwebtoken'

// GET /api/foto-ia/imagens/[id] — serve imagem com autenticação
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  const { id } = params

  // Aceitar autenticação via sessão ou token temporário
  const token = req.nextUrl.searchParams.get('token')
  let organizacaoId: string | null = null

  if (token) {
    const secret = process.env.NEXTAUTH_SECRET ?? 'fotoia-secret'
    try {
      const decoded = jwt.verify(token, secret) as { pedidoId: string }
      const img = await prisma.imagemFotoIA.findUnique({
        where: { id },
        include: { pedido: { select: { organizacaoId: true, id: true } } },
      })
      if (img?.pedido.id === decoded.pedidoId) {
        organizacaoId = img.pedido.organizacaoId
      }
    } catch {
      return NextResponse.json({ error: 'Token inválido' }, { status: 401 })
    }
  } else {
    const session = await getServerSession(authOptions)
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    organizacaoId = session.user.organizacaoId
  }

  const imagem = await prisma.imagemFotoIA.findUnique({
    where: { id },
    include: { pedido: { select: { organizacaoId: true } } },
  })

  if (!imagem || imagem.pedido.organizacaoId !== organizacaoId) {
    return NextResponse.json({ error: 'Imagem não encontrada' }, { status: 404 })
  }

  // Servir do storage local
  const buffer = getImageBuffer(imagem.url)
  if (!buffer) {
    // Fallback: redirecionar para URL pública se disponível
    if (imagem.urlPublica) {
      return NextResponse.redirect(imagem.urlPublica)
    }
    return NextResponse.json({ error: 'Imagem não disponível' }, { status: 404 })
  }

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      'Content-Type': 'image/png',
      'Cache-Control': 'private, max-age=3600',
    },
  })
}
