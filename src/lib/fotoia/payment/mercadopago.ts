export interface CreatePixChargeInput {
  customerName: string
  customerEmail: string
  value: number
  description: string
  idempotencyKey: string
}

export interface PixChargeResult {
  chargeId: string
  paymentLink: string
  pixQrCode: string         // copia-e-cola PIX
  pixQrCodeBase64: string   // imagem QR Code em base64
  status: string
}

const MP_BASE_URL = 'https://api.mercadopago.com'

function getAccessToken(): string {
  const token = process.env.MERCADOPAGO_ACCESS_TOKEN
  if (!token) throw new Error('MERCADOPAGO_ACCESS_TOKEN não configurado')
  return token
}

export async function createPixCharge(input: CreatePixChargeInput): Promise<PixChargeResult> {
  const accessToken = getAccessToken()

  const [firstName, ...rest] = input.customerName.trim().split(' ')
  const lastName = rest.join(' ') || firstName

  const response = await fetch(`${MP_BASE_URL}/v1/payments`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
      'X-Idempotency-Key': input.idempotencyKey,
    },
    body: JSON.stringify({
      transaction_amount: input.value,
      description: input.description,
      payment_method_id: 'pix',
      payer: {
        email: input.customerEmail,
        first_name: firstName,
        last_name: lastName,
      },
    }),
  })

  if (!response.ok) {
    const err = await response.text()
    throw new Error(`Erro ao criar cobrança PIX no Mercado Pago: ${err}`)
  }

  const payment = await response.json()
  const txData = payment.point_of_interaction?.transaction_data

  if (!txData?.qr_code) {
    throw new Error('Mercado Pago não retornou dados do PIX')
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? process.env.NEXTAUTH_URL ?? 'http://localhost:3000'

  return {
    chargeId: String(payment.id),
    paymentLink: `${appUrl}/api/foto-ia/pix/${payment.id}`,
    pixQrCode: txData.qr_code,
    pixQrCodeBase64: txData.qr_code_base64 ?? '',
    status: payment.status,
  }
}

export async function getPaymentStatus(paymentId: string): Promise<string> {
  const accessToken = getAccessToken()

  const response = await fetch(`${MP_BASE_URL}/v1/payments/${paymentId}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  })

  if (!response.ok) throw new Error('Erro ao consultar pagamento no Mercado Pago')

  const payment = await response.json()
  return payment.status // 'pending' | 'approved' | 'rejected' | 'cancelled'
}

export async function validateMpWebhook(body: string, signature: string, _requestId: string): Promise<boolean> {
  const secret = process.env.MERCADOPAGO_WEBHOOK_SECRET
  if (!secret) return true // sem secret, aceitar (configurar em produção!)

  // Assinatura MP: HMAC-SHA256 de "id:{requestId};request-id:{requestId};ts:{timestamp};"
  // Documentação: https://www.mercadopago.com.br/developers/pt/docs/your-integrations/notifications/webhooks
  const { createHmac } = await import('node:crypto')
  const expected = createHmac('sha256', secret).update(body).digest('hex')
  return expected === signature
}
