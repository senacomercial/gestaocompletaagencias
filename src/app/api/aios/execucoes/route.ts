import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

const INTERNAL_TOKEN = process.env.AIOS_API_KEY || ''

export async function POST(req: NextRequest) {
  const token = req.headers.get('x-aios-key')
  if (!INTERNAL_TOKEN || token !== INTERNAL_TOKEN) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  }

  let body: unknown
  try { body = await req.json() } catch { return NextResponse.json({ error: 'Body inválido' }, { status: 400 }) }

  const { agenteId, comando, organizacaoId, usuarioId } = body as Record<string, string>

  const agente = await prisma.agente.findFirst({ where: { id: agenteId, organizacaoId } })
  if (!agente) return NextResponse.json({ error: 'Agente não encontrado' }, { status: 404 })

  const usuario = usuarioId
    ? await prisma.usuario.findFirst({ where: { id: usuarioId, organizacaoId } })
    : await prisma.usuario.findFirst({ where: { organizacaoId } })

  if (!usuario) return NextResponse.json({ error: 'Usuário não encontrado' }, { status: 404 })

  const execucao = await prisma.execucao.create({
    data: { agenteId, usuarioId: usuario.id, organizacaoId, comando, status: 'PENDENTE' },
  })

  return NextResponse.json({ execucaoId: execucao.id }, { status: 201 })
}
