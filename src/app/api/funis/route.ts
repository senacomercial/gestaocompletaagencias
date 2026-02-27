import { NextRequest, NextResponse } from 'next/server'
import { ZodError } from 'zod'
import { requireAuth } from '@/lib/auth'
import { createFunilSchema } from '@/lib/validators/funil'
import { getFunis, createFunil } from '@/lib/services/funis'

export async function GET() {
  try {
    const session = await requireAuth()
    const funis = await getFunis(session.user.organizacaoId)
    return NextResponse.json(funis)
  } catch (error) {
    if (error instanceof Error && error.message.includes('NEXT_REDIRECT')) throw error
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await requireAuth()
    const body = await request.json()
    const data = createFunilSchema.parse(body)
    const funil = await createFunil(data, session.user.organizacaoId)
    return NextResponse.json(funil, { status: 201 })
  } catch (error) {
    if (error instanceof ZodError) return NextResponse.json({ error: error.errors }, { status: 422 })
    if (error instanceof Error && error.message.includes('NEXT_REDIRECT')) throw error
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
