import { NextRequest, NextResponse } from 'next/server'
import { z, ZodError } from 'zod'
import { requireAuth } from '@/lib/auth'
import { addTag, removeTag } from '@/lib/services/leads'

const tagBodySchema = z.object({ tagId: z.string().cuid() })

export async function POST(request: NextRequest, { params }: { params: Promise<{id: string}> }) {
  try {
    const session = await requireAuth()
    const body = await request.json()
    const { tagId } = tagBodySchema.parse(body)
    const leadTag = await addTag((await params).id, tagId, session.user.organizacaoId)
    return NextResponse.json(leadTag, { status: 201 })
  } catch (error) {
    if (error instanceof ZodError) return NextResponse.json({ error: error.errors }, { status: 422 })
    if (error instanceof Error && error.message.includes('NEXT_REDIRECT')) throw error
    if (error instanceof Error) return NextResponse.json({ error: error.message }, { status: 400 })
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{id: string}> }) {
  try {
    const session = await requireAuth()
    const body = await request.json()
    const { tagId } = tagBodySchema.parse(body)
    await removeTag((await params).id, tagId, session.user.organizacaoId)
    return new NextResponse(null, { status: 204 })
  } catch (error) {
    if (error instanceof ZodError) return NextResponse.json({ error: error.errors }, { status: 422 })
    if (error instanceof Error && error.message.includes('NEXT_REDIRECT')) throw error
    if (error instanceof Error) return NextResponse.json({ error: error.message }, { status: 400 })
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
