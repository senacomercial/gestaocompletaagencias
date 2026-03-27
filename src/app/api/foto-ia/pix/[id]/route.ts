import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// GET /api/foto-ia/pix/[id] — retorna dados PIX do pedido (sem auth, usado no link enviado ao cliente)
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{id: string}> },
) {
  const pedido = await prisma.pedidoFotoIA.findFirst({
    where: { cobrancaId: (await params).id },
    select: {
      id: true,
      status: true,
      valorCobrado: true,
      linkPagamento: true, // pixQrCode (copia-e-cola)
      observacoes: true,   // pixQrCodeBase64 armazenado aqui
      tipoFoto: true,
      lead: { select: { nome: true } },
    },
  })

  if (!pedido) return NextResponse.json({ error: 'Cobrança não encontrada' }, { status: 404 })

  // Extrair base64 do QR Code das observações
  let qrCodeBase64: string | null = null
  if (pedido.observacoes?.startsWith('pix_qrcode_base64:')) {
    qrCodeBase64 = pedido.observacoes.replace('pix_qrcode_base64:', '')
  }

  return NextResponse.json({
    status: pedido.status,
    valor: Number(pedido.valorCobrado ?? 0),
    pixCopiaECola: pedido.linkPagamento,
    qrCodeBase64,
    leadNome: pedido.lead.nome,
    tipoFoto: pedido.tipoFoto,
    pago: pedido.status === 'PAGAMENTO_CONFIRMADO' || pedido.status === 'EM_PRODUCAO'
      || pedido.status === 'AGUARDANDO_APROVACAO' || pedido.status === 'ENTREGUE',
  })
}
