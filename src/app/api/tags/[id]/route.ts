import { NextRequest, NextResponse } from 'next/server'
import { ZodError } from 'zod'
import { requireAuth } from '@/lib/auth'
import { updateTagSchema } from '@/lib/validators/tag'
import { updateTag, deleteTag } from '@/lib/services/tags'

export async function PUT(request: NextRequest, { params }: { params: Promise<{id: string}> }) {
  try {
    const session = await requireAuth()
    const body = await request.json()
    const data = updateTagSchema.parse(body)
    const tag = await updateTag((await params).id, data, session.user.organizacaoId)
    return NextResponse.json(tag)
  } catch (error) {
    if (error instanceof ZodError) return NextResponse.json({ error: error.errors }, { status: 422 })
    if (error instanceof Error && error.message.includes('NEXT_REDIRECT')) throw error
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}

export async function DELETE(_request: NextRequest, { params }: { params: Promise<{id: string}> }) {
  try {
    const session = await requireAuth()
    await deleteTag((await params).id, session.user.organizacaoId)
    return new NextResponse(null, { status: 204 })
  } catch (error) {
    if (error instanceof Error && error.message.includes('NEXT_REDIRECT')) throw error
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
