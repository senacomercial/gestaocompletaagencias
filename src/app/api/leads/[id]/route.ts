import { NextRequest, NextResponse } from 'next/server'
import { ZodError } from 'zod'
import { requireAuth } from '@/lib/auth'
import { updateLeadSchema } from '@/lib/validators/lead'
import { getLead, updateLead, deleteLead } from '@/lib/services/leads'

export async function GET(_request: NextRequest, { params }: { params: Promise<{id: string}> }) {
  try {
    const session = await requireAuth()
    const lead = await getLead((await params).id, session.user.organizacaoId)
    if (!lead) return NextResponse.json({ error: 'Lead não encontrado' }, { status: 404 })
    return NextResponse.json(lead)
  } catch (error) {
    if (error instanceof Error && error.message.includes('NEXT_REDIRECT')) throw error
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{id: string}> }) {
  try {
    const session = await requireAuth()
    const body = await request.json()
    const data = updateLeadSchema.parse(body)
    const lead = await updateLead((await params).id, data, session.user.organizacaoId)
    return NextResponse.json(lead)
  } catch (error) {
    if (error instanceof ZodError) return NextResponse.json({ error: error.errors }, { status: 422 })
    if (error instanceof Error && error.message.includes('NEXT_REDIRECT')) throw error
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}

export async function DELETE(_request: NextRequest, { params }: { params: Promise<{id: string}> }) {
  try {
    const session = await requireAuth()
    await deleteLead((await params).id, session.user.organizacaoId)
    return new NextResponse(null, { status: 204 })
  } catch (error) {
    if (error instanceof Error && error.message.includes('NEXT_REDIRECT')) throw error
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
