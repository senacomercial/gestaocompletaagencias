import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/auth'

export async function GET() {
  const session = await requireAuth()
  const organizacaoId = session.user.organizacaoId

  // Agrupar por telefone, pegar última mensagem
  const grupos = await prisma.mensagem.groupBy({
    by: ['telefoneContato'],
    where: { organizacaoId, leadId: null },
    _count: { id: true },
    orderBy: { _count: { id: 'desc' } },
    take: 50,
  })

  // Buscar última mensagem de cada grupo
  const contatos = await Promise.all(
    grupos.map(async (g) => {
      const ultima = await prisma.mensagem.findFirst({
        where: { organizacaoId, telefoneContato: g.telefoneContato, leadId: null },
        orderBy: { timestamp: 'desc' },
        select: { corpo: true, timestamp: true },
      })
      return {
        telefoneContato: g.telefoneContato,
        _count: g._count,
        ultimaMensagem: ultima?.corpo ?? '',
        timestamp: ultima?.timestamp ?? new Date(),
      }
    })
  )

  return NextResponse.json(contatos)
}
