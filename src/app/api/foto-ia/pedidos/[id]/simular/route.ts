/**
 * POST /api/foto-ia/pedidos/[id]/simular
 *
 * Endpoint exclusivo para TESTES — simula pagamento confirmado e
 * preenche os campos necessários (pacote, tema, foto) para iniciar
 * a geração sem passar pelo fluxo WhatsApp.
 */
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { StatusPedidoFoto } from '@prisma/client'
import path from 'path'
import fs from 'fs'

const PACOTES = {
  BASICO:       { preco: 27,  revisoes: 1  },
  PROFISSIONAL: { preco: 47,  revisoes: 4  },
  PREMIUM:      { preco: 97,  revisoes: 10 },
} as const

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const pedidoId = params.id
  const body = await req.json().catch(() => ({}))
  const {
    tema = 'profissional corporativo',
    pacote = 'PROFISSIONAL',
    fotoUrl,
  } = body as { tema?: string; pacote?: 'BASICO' | 'PROFISSIONAL' | 'PREMIUM'; fotoUrl?: string }

  const pedido = await prisma.pedidoFotoIA.findFirst({
    where: { id: pedidoId, organizacaoId: session.user.organizacaoId },
  })
  if (!pedido) return NextResponse.json({ error: 'Pedido não encontrado' }, { status: 404 })

  const cfg = PACOTES[pacote] ?? PACOTES.PROFISSIONAL

  // ── Baixar foto do rosto se uma URL foi fornecida ──────────────────────────
  let fotoClienteUrl: string | undefined = pedido.fotoClienteUrl ?? undefined

  if (fotoUrl) {
    try {
      const imgRes = await fetch(fotoUrl)
      if (!imgRes.ok) throw new Error(`HTTP ${imgRes.status}`)

      const contentType = imgRes.headers.get('content-type') ?? 'image/jpeg'
      const ext = contentType.includes('png') ? 'png' : contentType.includes('webp') ? 'webp' : 'jpg'

      const buffer = Buffer.from(await imgRes.arrayBuffer())
      const dir = path.join(process.cwd(), 'public', 'uploads', 'foto-ia', 'clientes', pedidoId)
      fs.mkdirSync(dir, { recursive: true })
      fs.writeFileSync(path.join(dir, `rosto.${ext}`), buffer)
      fotoClienteUrl = `/uploads/foto-ia/clientes/${pedidoId}/rosto.${ext}`
    } catch (err) {
      return NextResponse.json(
        { error: `Não foi possível baixar a foto: ${String(err)}` },
        { status: 400 },
      )
    }
  }

  // ── Atualizar pedido com dados simulados ────────────────────────────────────
  const updated = await prisma.pedidoFotoIA.update({
    where: { id: pedidoId },
    data: {
      pacote,
      valorCobrado: cfg.preco,
      revisoesMaximas: cfg.revisoes,
      temaFoto: tema,
      ...(fotoClienteUrl && { fotoClienteUrl }),
      status: fotoClienteUrl
        ? StatusPedidoFoto.EM_PRODUCAO
        : StatusPedidoFoto.PAGAMENTO_CONFIRMADO,
    },
  })

  await prisma.execucaoFotoIA.create({
    data: {
      pedidoId,
      etapa: 'simular-pagamento',
      status: 'concluido',
      saida: { pacote, tema, fotoClienteUrl: fotoClienteUrl ?? null, modo: 'teste' } as object,
    },
  })

  // ── Disparar geração se foto já está disponível ────────────────────────────
  if (fotoClienteUrl) {
    const { gerarImagens } = await import('@/lib/fotoia/agents/produtor')
    await gerarImagens(pedidoId).catch(err => {
      console.error('[simular] Erro ao gerar imagens:', err)
      // Não propaga — o status já foi atualizado
    })
  }

  return NextResponse.json({ ok: true, status: updated.status, fotoClienteUrl })
}
