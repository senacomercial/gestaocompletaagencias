import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/auth'

export async function GET() {
  const session = await requireAuth()
  const organizacaoId = session.user.organizacaoId

  const [totalMensagens, naoIdentificadas] = await Promise.all([
    prisma.mensagem.count({
      where: { organizacaoId, lida: false, fromMe: false },
    }),
    prisma.mensagem.groupBy({
      by: ['telefoneContato'],
      where: { organizacaoId, leadId: null },
      _count: { id: true },
    }),
  ])

  return NextResponse.json({
    totalMensagens,
    naoIdentificadas: naoIdentificadas.length,
  })
}
