import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { conversaoSchema } from '@/lib/validators/conversao'
import { registrarVenda } from '@/lib/services/conversao'

export async function POST(req: NextRequest) {
  const session = await requireAuth()
  const organizacaoId = session.user.organizacaoId

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Body inválido' }, { status: 400 })
  }

  const parsed = conversaoSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 })
  }

  try {
    const result = await registrarVenda(parsed.data, organizacaoId)
    return NextResponse.json(result, { status: 201 })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Erro interno'
    return NextResponse.json({ error: msg }, { status: 400 })
  }
}
