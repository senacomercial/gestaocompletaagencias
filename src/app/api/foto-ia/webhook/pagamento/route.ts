import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getPaymentStatus } from '@/lib/fotoia/payment/mercadopago'
import { confirmarPagamento } from '@/lib/fotoia/agents/cobrador'
import { onStatusChange } from '@/lib/fotoia/pipeline-orchestrator'

// POST /api/foto-ia/webhook/pagamento — recebe notificações do Mercado Pago
// Configurar este URL no painel MP: Suas integrações → Webhooks
export async function POST(req: NextRequest) {
  let payload: {
    action?: string
    type?: string
    data?: { id?: string | number }
  }

  try {
    payload = await req.json()
  } catch {
    return NextResponse.json({ error: 'Payload inválido' }, { status: 400 })
  }

  // Mercado Pago envia: {"action":"payment.updated","data":{"id":"123456"}}
  const isPaymentEvent =
    payload.action === 'payment.updated' || payload.type === 'payment'

  if (!isPaymentEvent || !payload.data?.id) {
    return NextResponse.json({ ok: true }) // ignorar outros eventos
  }

  const mpPaymentId = String(payload.data.id)

  // Consultar status atualizado no MP
  let mpStatus: string
  try {
    mpStatus = await getPaymentStatus(mpPaymentId)
  } catch (err) {
    console.error('[WebhookPagamento] Erro ao consultar MP:', err)
    return NextResponse.json({ ok: true }) // não falhar o webhook
  }

  if (mpStatus !== 'approved') {
    return NextResponse.json({ ok: true }) // aguardar aprovação
  }

  // Encontrar pedido pelo cobrancaId
  const pedido = await prisma.pedidoFotoIA.findFirst({
    where: { cobrancaId: mpPaymentId },
  })

  if (!pedido) {
    console.warn(`[WebhookPagamento] Cobrança MP ${mpPaymentId} não encontrada em nenhum pedido`)
    return NextResponse.json({ ok: true })
  }

  // Evitar processar duas vezes
  if (pedido.status === 'PAGAMENTO_CONFIRMADO' || pedido.status === 'EM_PRODUCAO') {
    return NextResponse.json({ ok: true })
  }

  await confirmarPagamento(pedido.id)
  await onStatusChange(pedido.id, 'PAGAMENTO_CONFIRMADO')

  return NextResponse.json({ ok: true })
}
