import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { onStatusChange } from '@/lib/fotoia/pipeline-orchestrator'

// GET /api/foto-ia/pedidos
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const status   = searchParams.get('status') ?? undefined
  const tipo     = searchParams.get('tipo')   ?? undefined
  const page     = parseInt(searchParams.get('page') ?? '1')
  const limit    = Math.min(parseInt(searchParams.get('limit') ?? '50'), 100)
  const skip     = (page - 1) * limit

  const where = {
    organizacaoId: session.user.organizacaoId,
    ...(status && { status: status as never }),
    ...(tipo   && { tipoFoto: tipo as never }),
  }

  const [pedidos, total] = await Promise.all([
    prisma.pedidoFotoIA.findMany({
      where,
      orderBy: { criadoEm: 'desc' },
      skip,
      take: limit,
      include: {
        lead: { select: { id: true, nome: true, empresa: true, telefone: true } },
        imagens: { where: { tipo: 'gerada' }, select: { url: true }, take: 1 },
        _count: { select: { imagens: true } },
      },
    }),
    prisma.pedidoFotoIA.count({ where }),
  ])

  return NextResponse.json({ pedidos, total, page, pages: Math.ceil(total / limit) })
}

// POST /api/foto-ia/pedidos
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { leadId, tipoFoto, descricao } = await req.json()
  if (!leadId || !tipoFoto) {
    return NextResponse.json({ error: 'leadId e tipoFoto são obrigatórios' }, { status: 400 })
  }

  // Verificar lead existe e pertence à org
  const lead = await prisma.lead.findFirst({
    where: { id: leadId, organizacaoId: session.user.organizacaoId },
    select: { id: true, nome: true },
  })
  if (!lead) return NextResponse.json({ error: 'Lead não encontrado' }, { status: 404 })

  // Verificar se já tem pedido ativo para este lead
  const existente = await prisma.pedidoFotoIA.findFirst({
    where: {
      leadId,
      organizacaoId: session.user.organizacaoId,
      status: { notIn: ['ENTREGUE', 'CANCELADO', 'PERDIDO'] },
    },
  })
  if (existente) {
    return NextResponse.json({ error: 'Lead já tem um pedido ativo', pedidoId: existente.id }, { status: 409 })
  }

  const pedido = await prisma.pedidoFotoIA.create({
    data: {
      organizacaoId: session.user.organizacaoId,
      leadId,
      tipoFoto: tipoFoto as never,
      descricao,
      status: 'NOVO_LEAD',
    },
  })

  // Disparar pipeline assincronamente
  onStatusChange(pedido.id, 'NOVO_LEAD' as never).catch(console.error)

  return NextResponse.json(pedido, { status: 201 })
}
