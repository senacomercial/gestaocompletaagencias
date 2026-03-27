import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { getKanbanData } from '@/lib/services/leads'

export async function GET(_request: NextRequest, { params }: { params: Promise<{id: string}> }) {
  try {
    const session = await requireAuth()
    const kanban = await getKanbanData(session.user.organizacaoId, (await params).id)
    if (!kanban) return NextResponse.json({ error: 'Funil não encontrado' }, { status: 404 })
    return NextResponse.json(kanban)
  } catch (error) {
    if (error instanceof Error && error.message.includes('NEXT_REDIRECT')) throw error
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
