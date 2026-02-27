import { NextRequest, NextResponse } from 'next/server'
import { ZodError } from 'zod'
import { requireAuth } from '@/lib/auth'
import { createEtapaSchema } from '@/lib/validators/funil'
import { getFunilComEtapas, createEtapa } from '@/lib/services/funis'

export async function GET(_request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await requireAuth()
    const funil = await getFunilComEtapas(params.id, session.user.organizacaoId)
    if (!funil) return NextResponse.json({ error: 'Funil não encontrado' }, { status: 404 })
    return NextResponse.json(funil.etapas)
  } catch (error) {
    if (error instanceof Error && error.message.includes('NEXT_REDIRECT')) throw error
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await requireAuth()
    const body = await request.json()
    const data = createEtapaSchema.parse(body)
    const etapa = await createEtapa(params.id, data, session.user.organizacaoId)
    return NextResponse.json(etapa, { status: 201 })
  } catch (error) {
    if (error instanceof ZodError) return NextResponse.json({ error: error.errors }, { status: 422 })
    if (error instanceof Error && error.message.includes('NEXT_REDIRECT')) throw error
    if (error instanceof Error) return NextResponse.json({ error: error.message }, { status: 400 })
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
