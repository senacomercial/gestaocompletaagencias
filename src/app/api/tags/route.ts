import { NextRequest, NextResponse } from 'next/server'
import { ZodError } from 'zod'
import { requireAuth } from '@/lib/auth'
import { createTagSchema } from '@/lib/validators/tag'
import { getTags, createTag } from '@/lib/services/tags'

export async function GET() {
  try {
    const session = await requireAuth()
    const tags = await getTags(session.user.organizacaoId)
    return NextResponse.json(tags)
  } catch (error) {
    if (error instanceof Error && error.message.includes('NEXT_REDIRECT')) throw error
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await requireAuth()
    const body = await request.json()
    const data = createTagSchema.parse(body)
    const tag = await createTag(data, session.user.organizacaoId)
    return NextResponse.json(tag, { status: 201 })
  } catch (error) {
    if (error instanceof ZodError) return NextResponse.json({ error: error.errors }, { status: 422 })
    if (error instanceof Error && error.message.includes('NEXT_REDIRECT')) throw error
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
