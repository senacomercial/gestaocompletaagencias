import { NextRequest, NextResponse } from 'next/server'
import { ZodError } from 'zod'
import { requireAuth } from '@/lib/auth'
import { createLeadSchema } from '@/lib/validators/lead'
import { getLeads, createLead } from '@/lib/services/leads'

export async function GET(request: NextRequest) {
  try {
    const session = await requireAuth()
    const { searchParams } = new URL(request.url)
    const funilId = searchParams.get('funilId') ?? undefined
    const leads = await getLeads(session.user.organizacaoId, funilId)
    return NextResponse.json(leads)
  } catch (error) {
    if (error instanceof Error && error.message.includes('NEXT_REDIRECT')) throw error
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await requireAuth()
    const body = await request.json()
    const data = createLeadSchema.parse(body)
    const lead = await createLead(data, session.user.organizacaoId)
    return NextResponse.json(lead, { status: 201 })
  } catch (error) {
    if (error instanceof ZodError) return NextResponse.json({ error: error.errors }, { status: 422 })
    if (error instanceof Error && error.message.includes('NEXT_REDIRECT')) throw error
    if (error instanceof Error) return NextResponse.json({ error: error.message }, { status: 400 })
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
