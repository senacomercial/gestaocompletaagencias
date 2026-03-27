import { NextRequest, NextResponse } from 'next/server'
import { ZodError } from 'zod'
import { requireAuth } from '@/lib/auth'
import { reordenarEtapasSchema } from '@/lib/validators/funil'
import { reordenarEtapas } from '@/lib/services/funis'

export async function PATCH(request: NextRequest, { params }: { params: Promise<{id: string}> }) {
  try {
    const session = await requireAuth()
    const body = await request.json()
    const { etapaIds } = reordenarEtapasSchema.parse(body)
    await reordenarEtapas((await params).id, etapaIds, session.user.organizacaoId)
    return NextResponse.json({ ok: true })
  } catch (error) {
    if (error instanceof ZodError) return NextResponse.json({ error: error.errors }, { status: 422 })
    if (error instanceof Error && error.message.includes('NEXT_REDIRECT')) throw error
    if (error instanceof Error) return NextResponse.json({ error: error.message }, { status: 400 })
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
