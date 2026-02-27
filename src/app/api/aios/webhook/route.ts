import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

const INTERNAL_TOKEN = process.env.AIOS_API_KEY || ''

export async function POST(req: NextRequest) {
  const token = req.headers.get('x-aios-key')
  if (!INTERNAL_TOKEN || token !== INTERNAL_TOKEN) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  }

  let body: unknown
  try { body = await req.json() } catch { return NextResponse.json({ error: 'Body inválido' }, { status: 400 }) }

  const { evento, execucaoId, mensagem, nivel, output } = body as Record<string, string>
  if (!execucaoId) return NextResponse.json({ error: 'execucaoId obrigatório' }, { status: 400 })

  const execucao = await prisma.execucao.findFirst({ where: { id: execucaoId } })
  if (!execucao) return NextResponse.json({ error: 'Execução não encontrada' }, { status: 404 })

  if (evento === 'execucao:iniciada') {
    await prisma.execucao.update({ where: { id: execucaoId }, data: { status: 'EM_ANDAMENTO' } })
  } else if (evento === 'execucao:log') {
    await prisma.logExecucao.create({
      data: {
        execucaoId,
        nivel: (['INFO', 'WARN', 'ERROR', 'SUCCESS'].includes(nivel) ? nivel : 'INFO') as 'INFO' | 'WARN' | 'ERROR' | 'SUCCESS',
        mensagem,
      },
    })
  } else if (evento === 'execucao:concluida') {
    await prisma.$transaction([
      prisma.execucao.update({
        where: { id: execucaoId },
        data: {
          status: 'CONCLUIDA',
          output,
          concluidoEm: new Date(),
          duracaoMs: Date.now() - execucao.iniciadoEm.getTime(),
        },
      }),
      prisma.agente.update({ where: { id: execucao.agenteId }, data: { status: 'DISPONIVEL' } }),
    ])
  } else if (evento === 'execucao:falha') {
    await prisma.$transaction([
      prisma.execucao.update({
        where: { id: execucaoId },
        data: { status: 'FALHA', output: mensagem, concluidoEm: new Date() },
      }),
      prisma.agente.update({ where: { id: execucao.agenteId }, data: { status: 'ERRO' } }),
    ])
  }

  return NextResponse.json({ success: true })
}
