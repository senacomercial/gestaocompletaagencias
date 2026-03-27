import { NextRequest, NextResponse } from 'next/server'
import { ZodError } from 'zod'
import { requireAuth } from '@/lib/auth'
import { updateFunilSchema } from '@/lib/validators/funil'
import { getFunilComEtapas, updateFunil, deleteFunil } from '@/lib/services/funis'

export async function GET(_request: NextRequest, { params }: { params: Promise<{id: string}> }) {
  try {
    const session = await requireAuth()
    const funil = await getFunilComEtapas((await params).id, session.user.organizacaoId)
    if (!funil) return NextResponse.json({ error: 'Funil não encontrado' }, { status: 404 })
    return NextResponse.json(funil)
  } catch (error) {
    if (error instanceof Error && error.message.includes('NEXT_REDIRECT')) throw error
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{id: string}> }) {
  try {
    const session = await requireAuth()
    const body = await request.json()
    const data = updateFunilSchema.parse(body)
    const funil = await updateFunil((await params).id, data, session.user.organizacaoId)
    return NextResponse.json(funil)
  } catch (error) {
    if (error instanceof ZodError) return NextResponse.json({ error: error.errors }, { status: 422 })
    if (error instanceof Error && error.message.includes('NEXT_REDIRECT')) throw error
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}

export async function DELETE(_request: NextRequest, { params }: { params: Promise<{id: string}> }) {
  try {
    const session = await requireAuth()
    await deleteFunil((await params).id, session.user.organizacaoId)
    return new NextResponse(null, { status: 204 })
  } catch (error) {
    if (error instanceof Error && error.message.includes('NEXT_REDIRECT')) throw error
    if (error instanceof Error) return NextResponse.json({ error: error.message }, { status: 400 })
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
