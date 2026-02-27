import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/auth'
import { criarMensagemSchema } from '@/lib/validators/mensagem'

// Token para acesso interno do socket-server
const INTERNAL_TOKEN = process.env.AIOS_API_KEY || ''

// =============================================================================
// POST /api/mensagens — Criação interna (socket-server)
// =============================================================================

export async function POST(req: NextRequest) {
  // Verificar token interno
  const token = req.headers.get('x-internal-token')
  if (!INTERNAL_TOKEN || token !== INTERNAL_TOKEN) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  }

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Body inválido' }, { status: 400 })
  }

  const parsed = criarMensagemSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 })
  }

  const { organizacaoId, telefoneContato, corpo, fromMe, whatsappId, timestamp, leadId } = parsed.data

  // Tentar vincular ao lead pelo telefone, se leadId não fornecido
  let resolvedLeadId = leadId ?? null
  if (!resolvedLeadId) {
    const lead = await prisma.lead.findFirst({
      where: {
        organizacaoId,
        telefone: { contains: telefoneContato.slice(-8) }, // busca pelo sufixo para flexibilidade
      },
      select: { id: true },
    })
    resolvedLeadId = lead?.id ?? null
  }

  const mensagem = await prisma.mensagem.create({
    data: {
      organizacaoId,
      telefoneContato,
      corpo,
      fromMe,
      whatsappId,
      timestamp: timestamp ? new Date(timestamp) : new Date(),
      leadId: resolvedLeadId,
    },
  })

  return NextResponse.json(mensagem, { status: 201 })
}

// =============================================================================
// GET /api/mensagens?leadId= — Histórico de conversa
// =============================================================================

export async function GET(req: NextRequest) {
  const session = await requireAuth()
  const organizacaoId = session.user.organizacaoId

  const { searchParams } = new URL(req.url)
  const leadId = searchParams.get('leadId')
  const telefone = searchParams.get('telefone')

  if (!leadId && !telefone) {
    return NextResponse.json({ error: 'leadId ou telefone obrigatório' }, { status: 400 })
  }

  const where = leadId
    ? { organizacaoId, leadId }
    : { organizacaoId, telefoneContato: { contains: (telefone as string).slice(-8) } }

  const mensagens = await prisma.mensagem.findMany({
    where,
    orderBy: { timestamp: 'asc' },
    take: 200,
  })

  // Marcar como lidas ao buscar
  if (leadId) {
    await prisma.mensagem.updateMany({
      where: { organizacaoId, leadId, lida: false, fromMe: false },
      data: { lida: true },
    })
  }

  return NextResponse.json(mensagens)
}
