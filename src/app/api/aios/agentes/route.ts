import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

const INTERNAL_TOKEN = process.env.AIOS_API_KEY || ''

export async function GET(req: NextRequest) {
  const token = req.headers.get('x-aios-key')
  if (!INTERNAL_TOKEN || token !== INTERNAL_TOKEN) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  }

  const organizacaoId = req.headers.get('x-organizacao-id')
  if (!organizacaoId) return NextResponse.json({ error: 'x-organizacao-id obrigatório' }, { status: 400 })

  const agentes = await prisma.agente.findMany({
    where: { organizacaoId },
    select: { id: true, nome: true, role: true, status: true, configuracao: true },
  })
  return NextResponse.json(agentes)
}
