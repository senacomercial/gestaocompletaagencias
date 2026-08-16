import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest) {
  try {
    const organizacoes = await prisma.organizacao.findMany({
      select: {
        id: true,
        nome: true,
        slug: true,
      },
      orderBy: {
        nome: 'asc',
      },
    })

    return NextResponse.json(organizacoes)
  } catch (erro) {
    console.error('Erro ao listar organizações:', erro)
    return NextResponse.json(
      { erro: 'Erro ao listar organizações' },
      { status: 500 }
    )
  }
}
