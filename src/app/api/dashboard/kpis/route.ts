import { NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { getKpis } from '@/lib/services/dashboard'

export const revalidate = 60 // Cache por 60 segundos

export async function GET() {
  try {
    const session = await requireAuth()
    const kpis = await getKpis(session.user.organizacaoId, session.user.id)
    return NextResponse.json(kpis)
  } catch (error) {
    if (error instanceof Error && error.message === 'Não autenticado') {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
    }
    console.error('Erro ao buscar KPIs:', error)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
