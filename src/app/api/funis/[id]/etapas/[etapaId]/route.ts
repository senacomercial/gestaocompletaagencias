import { NextRequest, NextResponse } from 'next/server'
import { ZodError } from 'zod'
import { requireAuth } from '@/lib/auth'
import { updateEtapaSchema } from '@/lib/validators/funil'
import { updateEtapa, deleteEtapa } from '@/lib/services/funis'

export async function PUT(request: NextRequest, { params }: { params: Promise<{id: string; etapaId: string}> }) {
  try {
    const session = await requireAuth()
    const body = await request.json()
    const data = updateEtapaSchema.parse(body)
    const etapa = await updateEtapa((await params).etapaId, (await params).id, data, session.user.organizacaoId)
    return NextResponse.json(etapa)
  } catch (error) {
    if (error instanceof ZodError) return NextResponse.json({ error: error.errors }, { status: 422 })
    if (error instanceof Error && error.message.includes('NEXT_REDIRECT')) throw error
    if (error instanceof Error) return NextResponse.json({ error: error.message }, { status: 400 })
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}

export async function DELETE(_request: NextRequest, { params }: { params: Promise<{id: string; etapaId: string}> }) {
  try {
    const session = await requireAuth()
    await deleteEtapa((await params).etapaId, (await params).id, session.user.organizacaoId)
    return new NextResponse(null, { status: 204 })
  } catch (error) {
    if (error instanceof Error && error.message.includes('NEXT_REDIRECT')) throw error
    if (error instanceof Error) return NextResponse.json({ error: error.message }, { status: 400 })
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
