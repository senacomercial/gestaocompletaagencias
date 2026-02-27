import { NextRequest, NextResponse } from 'next/server'
import { ZodError } from 'zod'
import { requireAuth } from '@/lib/auth'
import { moverEtapaSchema } from '@/lib/validators/lead'
import { moverEtapa } from '@/lib/services/leads'

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await requireAuth()
    const body = await request.json()
    const { etapaId, funilId } = moverEtapaSchema.parse(body)
    const lead = await moverEtapa(params.id, etapaId, funilId, session.user.organizacaoId)
    return NextResponse.json(lead)
  } catch (error) {
    if (error instanceof ZodError) return NextResponse.json({ error: error.errors }, { status: 422 })
    if (error instanceof Error && error.message.includes('NEXT_REDIRECT')) throw error
    if (error instanceof Error) return NextResponse.json({ error: error.message }, { status: 400 })
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
