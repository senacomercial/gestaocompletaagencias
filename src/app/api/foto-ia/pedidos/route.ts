import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { StatusPedidoFoto, TipoFotoIA } from '@prisma/client'
import { onStatusChange } from '@/lib/fotoia/pipeline-orchestrator'

// GET /api/foto-ia/pedidos — listar pedidos com filtros
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const status = searchParams.get('status') as StatusPedidoFoto | null
  const tipoFoto = searchParams.get('tipoFoto') as TipoFotoIA | null
  const page = parseInt(searchParams.get('page') ?? '1')
  const limit = parseInt(searchParams.get('limit') ?? '20')

  const where = {
    organizacaoId: session.user.organizacaoId,
    ...(status && { status }),
    ...(tipoFoto && { tipoFoto }),
  }

  const [total, pedidos] = await Promise.all([
    prisma.pedidoFotoIA.count({ where }),
    prisma.pedidoFotoIA.findMany({
      where,
      orderBy: { criadoEm: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
      include: {
        lead: { select: { id: true, nome: true, telefone: true, empresa: true } },
        imagens: { where: { aprovada: true }, take: 1, select: { url: true } },
        _count: { select: { imagens: true } },
      },
    }),
  ])

  return NextResponse.json({ pedidos, total, page, totalPages: Math.ceil(total / limit) })
}

// POST /api/foto-ia/pedidos — criar novo pedido
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { leadId, tipoFoto, descricao } = body

  if (!leadId || !tipoFoto) {
    return NextResponse.json({ error: 'leadId e tipoFoto são obrigatórios' }, { status: 400 })
  }

  // Verificar se o lead pertence à organização
  const lead = await prisma.lead.findFirst({
    where: { id: leadId, organizacaoId: session.user.organizacaoId },
  })
  if (!lead) return NextResponse.json({ error: 'Lead não encontrado' }, { status: 404 })

  const pedido = await prisma.pedidoFotoIA.create({
    data: {
      leadId,
      organizacaoId: session.user.organizacaoId,
      tipoFoto: tipoFoto as TipoFotoIA,
      descricao,
      status: 'NOVO_LEAD',
    },
    include: {
      lead: { select: { id: true, nome: true, telefone: true } },
    },
  })

  // Disparar pipeline automaticamente
  onStatusChange(pedido.id, StatusPedidoFoto.NOVO_LEAD).catch(console.error)

  return NextResponse.json(pedido, { status: 201 })
}
