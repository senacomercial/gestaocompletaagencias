import { NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { getAtividadeRecente } from '@/lib/services/dashboard'

export const revalidate = 30

export async function GET() {
  try {
    const session = await requireAuth()
    const atividade = await getAtividadeRecente(session.user.organizacaoId)
    return NextResponse.json(atividade)
  } catch (error) {
    if (error instanceof Error && error.message === 'Não autenticado') {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
    }
    console.error('Erro ao buscar atividade recente:', error)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
